import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface TerraformResult {
  success: boolean;
  output?: string;
  errors?: string;
}

@Injectable()
export class TerraformService {
  private readonly logger = new Logger(TerraformService.name);

  /**
   * Ensures base terraform.tfvars file exists with required variables
   */
  async ensureBaseTfvars(environment: string): Promise<void> {
    const tfvarsPath = `/terraform/environments/${environment}-tenants/terraform.tfvars`;

    try {
      await fs.access(tfvarsPath);
      this.logger.log(`Base tfvars file exists at ${tfvarsPath}`);
    } catch (err) {
      this.logger.log(`Creating base tfvars file at ${tfvarsPath}`);

      const projectId = process.env.GCP_PROJECT || 'cloudappdev-dev';
      const region = process.env.GCP_REGION || 'europe-west1';
      const cloudflareZoneId =
        process.env.CLOUDFLARE_ZONE_ID || 'ddbd47810ae075fc0bc55a4ef05a91ec';

      const content = `# Base Terraform Configuration
# Managed by infrastructure-provisioner service

project_id         = "${projectId}"
region             = "${region}"
environment        = "${environment}"
cloudflare_zone_id = "${cloudflareZoneId}"
`;

      await fs.writeFile(tfvarsPath, content, 'utf-8');
      this.logger.log('Successfully created base tfvars file');
    }
  }

  /**
   * Adds a tenant to the tenants.tfvars file
   */
  async addTenantToTfvars(
    tenantName: string,
    tier: string,
    environment: string,
  ): Promise<void> {
    const tfvarsPath = `/terraform/environments/${environment}-tenants/tenants.tfvars`;

    let content = '';
    try {
      content = await fs.readFile(tfvarsPath, 'utf-8');
    } catch (err) {
      this.logger.log(`Creating ${tfvarsPath} with empty tenant list`);
      content = `# Tenant Infrastructure Configuration
# Managed by infrastructure-provisioner service

tenants = []
`;
      try {
        await fs.writeFile(tfvarsPath, content, 'utf-8');
        this.logger.log(`Successfully created ${tfvarsPath}`);
      } catch (writeErr) {
        this.logger.error(`Failed to create ${tfvarsPath}:`, writeErr.message);
        throw writeErr;
      }
    }

    // Parse existing tenants
    const tenantRegex = /tenants\s*=\s*\[([\s\S]*?)\]/;
    const match = content.match(tenantRegex);

    let tenantsArray: string[] = [];
    if (match && match[1].trim()) {
      const tenantBlocks = match[1].split('},').filter((b) => b.trim());
      tenantsArray = tenantBlocks
        .map((block) => {
          const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
          return nameMatch ? nameMatch[1] : null;
        })
        .filter(Boolean) as string[];
    }

    // Check if tenant already exists
    if (tenantsArray.includes(tenantName)) {
      this.logger.log(`Tenant ${tenantName} already exists in tfvars`);
      return;
    }

    // Add new tenant
    const newTenantBlock = `  {
    name = "${tenantName}"
    tier = "${tier}"
  }`;

    if (tenantsArray.length === 0) {
      content = `tenants = [\n${newTenantBlock}\n]\n`;
    } else {
      content = content.replace(/\](\s*)$/, `,\n${newTenantBlock}\n]$1`);
    }

    await fs.writeFile(tfvarsPath, content, 'utf-8');
    this.logger.log(`Added tenant ${tenantName} to ${tfvarsPath}`);
  }

  /**
   * Removes a tenant from tenants.tfvars
   */
  async removeTenantFromTfvars(
    tenantName: string,
    environment: string,
  ): Promise<void> {
    const tfvarsPath = `/terraform/environments/${environment}-tenants/tenants.tfvars`;

    let content = await fs.readFile(tfvarsPath, 'utf-8');

    const tenantBlockRegex = new RegExp(
      `,?\\s*\\{[^}]*name\\s*=\\s*"${tenantName}"[^}]*\\}\\s*,?`,
      'g',
    );

    content = content.replace(tenantBlockRegex, '');
    content = content.replace(/,\s*,/g, ',').replace(/,(\s*)\]/g, '$1]');

    await fs.writeFile(tfvarsPath, content, 'utf-8');
    this.logger.log(`Removed tenant ${tenantName} from ${tfvarsPath}`);
  }

  /**
   * Runs terraform apply for the specified environment
   */
  async runTerraformApply(environment: string): Promise<TerraformResult> {
    const workDir = `/terraform/environments/${environment}-tenants`;

    this.logger.log(`Running terraform apply in ${workDir}`);

    try {
      await this.ensureBaseTfvars(environment);

      this.logger.log('Initializing Terraform...');
      await execAsync('terraform init -input=false', {
        cwd: workDir,
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024,
      });

      this.logger.log('Init completed, starting apply...');

      // Retry logic for lock conflicts
      let lastError: Error | null = null;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const { stdout, stderr } = await execAsync(
            'terraform apply -auto-approve -input=false -lock-timeout=10m -var-file=terraform.tfvars -var-file=tenants.tfvars',
            {
              cwd: workDir,
              timeout: 1200000,
              maxBuffer: 10 * 1024 * 1024,
            },
          );

          this.logger.log('Apply completed successfully');

          return {
            success: true,
            output: stdout,
            errors: stderr,
          };
        } catch (applyError: any) {
          lastError = applyError;

          // Check if it's a lock error
          if (
            applyError.message?.includes('Error acquiring the state lock') &&
            attempt < maxRetries
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
                this.logger.log('Successfully released stale lock, retrying...');
                // Wait a bit before retry
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue; // Retry the apply
              } catch (unlockError) {
                this.logger.error(
                  'Failed to force-unlock:',
                  unlockError.message,
                );
              }
            }
          }

          // If not a lock error or last attempt, throw
          throw applyError;
        }
      }

      throw lastError;
    } catch (error) {
      this.logger.error('Error during apply:', error.message);
      throw error;
    }
  }

  /**
   * Gets Terraform outputs for a specific tenant
   */
  async getTerraformOutputsForTenant(
    tenantName: string,
    environment: string,
  ): Promise<any> {
    const workDir = `/terraform/environments/${environment}-tenants`;

    try {
      const { stdout } = await execAsync('terraform output -json', {
        cwd: workDir,
      });
      const outputs = JSON.parse(stdout);

      const deployments = outputs.enterprise_deployments?.value || {};
      return deployments[tenantName] || null;
    } catch (err) {
      this.logger.error(
        `Failed to get outputs for ${tenantName}:`,
        err.message,
      );
      return null;
    }
  }

  /**
   * Lists all provisioned tenants from Terraform state
   */
  async listProvisionedTenants(environment: string): Promise<any> {
    const workDir = `/terraform/environments/${environment}-tenants`;

    try {
      const { stdout } = await execAsync('terraform output -json', {
        cwd: workDir,
      });
      const outputs = JSON.parse(stdout);

      return {
        enterprise: outputs.enterprise_tenants?.value || {},
        domains: outputs.tenant_domains?.value || {},
      };
    } catch (err) {
      this.logger.error('Failed to read outputs:', err.message);
      return { enterprise: {}, domains: {} };
    }
  }
}
