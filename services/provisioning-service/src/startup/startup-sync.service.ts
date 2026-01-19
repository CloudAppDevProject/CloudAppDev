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
    } catch (error) {
      this.logger.error(`Startup sync failed: ${error.message}`);
      this.logger.warn('Service will continue despite sync failure');
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
    const url =
      process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';

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

    await fs.writeFile(tfvarsPath, content, 'utf-8');
    this.logger.log(`Wrote ${tenants.length} tenants to ${tfvarsPath}`);
  }

  private async runTerraformApply(environment: string): Promise<void> {
    const workDir = `/terraform/environments/${environment}-tenants`;

    this.logger.log('Running terraform init...');
    await execAsync('terraform init -input=false', {
      cwd: workDir,
      timeout: 300000,
    });

    this.logger.log('Running terraform apply...');
    await execAsync(
      'terraform apply -auto-approve -input=false -var-file=terraform.tfvars -var-file=tenants.tfvars',
      { cwd: workDir, timeout: 1200000 },
    );
    this.logger.log('Terraform apply completed');
  }
}
