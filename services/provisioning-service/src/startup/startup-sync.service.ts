/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TenantDto {
  uuid: string;
  name: string;
  namespace: string;
  tier: string;
}

@Injectable()
export class StartupSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupSyncService.name);
  private readonly maxRetries = 5;
  private readonly retryDelayMs = 5000;

  constructor(private readonly httpService: HttpService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SKIP_STARTUP_SYNC === 'true') {
      this.logger.warn('Startup sync disabled via SKIP_STARTUP_SYNC');
      return;
    }

    this.logger.log('Starting tenant infrastructure synchronization...');

    try {
      await this.synchronizeTenants();
      this.logger.log('Startup synchronization completed successfully');
      this.logger.log('Starting deployment synchronization...');
      await this.synchronizeDeployments();
      this.logger.log('Deployment synchronization completed successfully');
    } catch (error) {
      this.logger.error(`Startup sync failed: ${error.message}`);
      this.logger.warn('Service will continue despite sync failure');
    }
  }
  private async synchronizeDeployments(): Promise<void> {
    // Fetch tenants again (could be cached from previous step if needed)
    const tenants = await this.fetchTenantsWithRetry();
    this.logger.log(`Synchronizing deployments for ${tenants.length} tenants`);

    if (tenants.length === 0) {
      this.logger.log('No tenants to deploy');
      return;
    }

    // Import services dynamically to avoid circular deps
    const { TerraformService } =
      await import('../terraform/terraform.service.js');
    const { KubernetesService } =
      await import('../kubernetes/kubernetes.service.js');
    // Instantiate services (in real app, use DI container)
    const terraformService = new TerraformService();
    const kubernetesService = new KubernetesService();

    const environment = process.env.ENVIRONMENT || 'dev';

    for (const tenant of tenants) {
      try {
        this.logger.log(
          `Ensuring deployment for tenant: ${tenant.namespace} (tier: ${tenant.tier})`,
        );
        // Use the same logic as provisionTenant, but skip tfvars/terraform (already done)
        if (tenant.tier === 'enterprise') {
          // Get terraform outputs for this tenant
          const terraformOutputs =
            await terraformService.getTerraformOutputsForTenant(
              tenant.namespace,
              environment,
            );
          if (terraformOutputs) {
            await kubernetesService.deployEnterpriseNamespace(
              tenant.namespace,
              environment,
              terraformOutputs,
            );
          } else {
            this.logger.warn(
              `No terraform outputs for enterprise tenant ${tenant.namespace}, skipping deployment.`,
            );
          }
          // Always deploy HTTPRoute for enterprise as well
          await kubernetesService.deploySharedTierHTTPRoute(
            tenant.namespace,
            tenant.tier,
            environment,
          );
        } else {
          // Free/standard: only HTTPRoute
          await kubernetesService.deploySharedTierHTTPRoute(
            tenant.namespace,
            tenant.tier,
            environment,
          );
        }
        this.logger.log(`Deployment ensured for tenant: ${tenant.namespace}`);
      } catch (err) {
        this.logger.error(
          `Failed to deploy for tenant ${tenant.namespace}: ${err.message}`,
        );
      }
    }
  }

  private async synchronizeTenants(): Promise<void> {
    const tenants = await this.fetchTenantsWithRetry();
    this.logger.log(`Fetched ${tenants.length} tenants`);

    if (tenants.length === 0) {
      this.logger.log('No tenants to synchronize');
      return;
    }

    const environment = process.env.ENVIRONMENT || 'dev';
    await this.writeTenantsToTfvars(tenants, environment);
    await this.runTerraformApply(environment);
  }

  private async fetchTenantsWithRetry(): Promise<TenantDto[]> {
    const url = process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<TenantDto[]>(`${url}/api/v1/tenants`),
        );
        return response.data;
      } catch (error) {
        this.logger.warn(
          `Attempt ${attempt}/${this.maxRetries} failed: ${error.message}`,
        );
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
        } else {
          throw error;
        }
      }
    }
    return [];
  }

  private async writeTenantsToTfvars(
    tenants: TenantDto[],
    environment: string,
  ): Promise<void> {
    const tfvarsPath = `/terraform/environments/${environment}-tenants/tenants.tfvars`;

    const tenantBlocks = tenants.map(
      (t) => `  {\n    name = "${t.namespace}"\n    tier = "${t.tier}"\n  }`,
    );

    const content = `# Tenant Infrastructure Configuration
# Managed by infrastructure-provisioner service
# Synchronized at: ${new Date().toISOString()}

tenants = [
${tenantBlocks.join(',\n')}
]
`;

    // Always overwrite tenants.tfvars to ensure tenant DB is the source of truth
    await fs.writeFile(tfvarsPath, content, 'utf-8');
    this.logger.log(
      `[SYNC] Overwrote ${tfvarsPath} with ${tenants.length} tenants from DB`,
    );
  }

  private async runTerraformApply(environment: string): Promise<void> {
    const workDir = `/terraform/environments/${environment}-tenants`;

    this.logger.log('Running terraform init...');
    await execAsync('terraform init -input=false', {
      cwd: workDir,
      timeout: 300000,
    });

    this.logger.log('Running terraform apply...');
    // Retry logic for lock conflicts
    let lastError: Error | null = null;
    const maxRetries = 2;
    let forceUnlockAttempted = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await execAsync(
          'terraform apply -auto-approve -input=false -var-file=terraform.tfvars -var-file=tenants.tfvars',
          { cwd: workDir, timeout: 1200000 },
        );
        this.logger.log('Terraform apply completed');
        return;
      } catch (applyError: any) {
        lastError = applyError;
        // Check if it's a lock error
        if (
          applyError.message?.includes('Error acquiring the state lock') &&
          !forceUnlockAttempted
        ) {
          this.logger.warn(
            `Lock conflict detected on attempt ${attempt}/${maxRetries}. Extracting lock ID...`,
          );
          // Try to extract lock ID from error message
          const lockIdMatch = applyError.message.match(/ID:\s+(\d+)/);
          if (lockIdMatch) {
            const lockId = lockIdMatch[1];
            this.logger.warn(
              `Attempting to force-unlock stale lock: ${lockId}`,
            );
            try {
              await execAsync(`terraform force-unlock -force ${lockId}`, {
                cwd: workDir,
              });
              this.logger.log(
                'Successfully released stale lock, retrying apply...',
              );
              // Wait a bit before retry
              await new Promise((resolve) => setTimeout(resolve, 2000));
              forceUnlockAttempted = true;
              attempt--; // retry this attempt after unlocking
              continue;
            } catch (unlockError) {
              this.logger.error('Failed to force-unlock:', unlockError.message);
            }
          }
        }
        // If not a lock error or last attempt, throw
        throw applyError;
      }
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw lastError;
  }
}
