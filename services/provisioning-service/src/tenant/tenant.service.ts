import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TerraformService } from '../terraform/terraform.service';
import { KubernetesService } from '../kubernetes/kubernetes.service';
import { ProvisionTenantDto, TenantTier } from './dto/provision-tenant.dto';
import { ProvisionTenantResponseDto } from './dto/provision-response.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly terraformService: TerraformService,
    private readonly kubernetesService: KubernetesService,
  ) {}

  /**
   * Provisions infrastructure for a new tenant
   */
  async provisionTenant(
    dto: ProvisionTenantDto,
  ): Promise<ProvisionTenantResponseDto> {
    let { tenantId, tenantName, tier, environment } = dto;

    environment = environment || 'dev';

    // Sanitize tenant name (only alphanumeric and hyphens)
    const sanitizedName = tenantName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    this.logger.log(
      `[Provision Request] Tenant: ${sanitizedName}, Tier: ${tier}, Env: ${environment}`,
    );

    let tenantAddedToTfvars = false;

    try {
      // Step 1: Update tenants.tfvars with new tenant
      await this.terraformService.addTenantToTfvars(
        sanitizedName,
        tier,
        environment,
      );
      tenantAddedToTfvars = true;

      // Step 2: Run Terraform apply
      let terraformResult;
      try {
        terraformResult =
          await this.terraformService.runTerraformApply(environment);
      } catch (terraformErr) {
        this.logger.error(
          `[Terraform Apply Error] ${terraformErr.message}`,
          terraformErr.stack || terraformErr,
        );

        // Rollback: Remove tenant from tfvars since Terraform failed
        try {
          await this.terraformService.removeTenantFromTfvars(
            sanitizedName,
            environment,
          );
          this.logger.log(
            `Removed ${sanitizedName} from tfvars after Terraform failure`,
          );
        } catch (rollbackErr) {
          this.logger.error(
            `Failed to remove tenant from tfvars during rollback: ${rollbackErr.message}`,
            rollbackErr.stack || rollbackErr,
          );
        }

        throw new InternalServerErrorException({
          success: false,
          tenantId,
          tenantName: sanitizedName,
          tier,
          error: 'Terraform provisioning failed',
          terraform: {
            message: terraformErr.message,
            details: terraformErr.stack,
          },
          message:
            'Infrastructure provisioning failed. Tenant entry removed from tfvars.',
        });
      }

      // Step 3: For enterprise, trigger Kubernetes deployment
      let deploymentResult: any = undefined;

      if (tier === TenantTier.ENTERPRISE) {
        // Enterprise: Full dedicated namespace deployment
        try {
          const terraformOutputs =
            await this.terraformService.getTerraformOutputsForTenant(
              sanitizedName,
              environment,
            );

          deploymentResult =
            await this.kubernetesService.deployEnterpriseNamespace(
              sanitizedName,
              environment,
              terraformOutputs,
            );
        } catch (deployErr) {
          this.logger.error(
            `[K8s Deployment Error] ${deployErr.message}`,
            deployErr.stack || deployErr,
          );

          // Rollback: Remove tenant from tfvars since deployment failed
          try {
            await this.terraformService.removeTenantFromTfvars(
              sanitizedName,
              environment,
            );
            this.logger.log(
              `Removed ${sanitizedName} from tfvars after deployment failure`,
            );
          } catch (rollbackErr) {
            this.logger.error(
              `Failed to remove tenant from tfvars during rollback: ${rollbackErr.message}`,
              rollbackErr.stack || rollbackErr,
            );
          }

          throw new InternalServerErrorException({
            success: false,
            tenantId,
            tenantName: sanitizedName,
            tier,
            error: 'Kubernetes deployment failed after Terraform provisioning',
            terraform: terraformResult,
            deployment: {
              message: deployErr.message,
              details: deployErr.stack,
            },
            message:
              'Infrastructure was provisioned but Kubernetes deployment failed. Tenant entry removed from tfvars.',
          });
        }
      } else {
        // Free/Standard: Deploy HTTPRoute for shared infrastructure
        try {
          await this.kubernetesService.deploySharedTierHTTPRoute(
            sanitizedName,
            tier,
            environment,
          );

          deploymentResult = {
            type: 'shared-infrastructure',
            httproute: `${sanitizedName}-httproute deployed to ${tier} namespace`,
            domain: `https://${sanitizedName}.cloudappdev.site`,
          };
        } catch (routeErr) {
          this.logger.error(
            `[HTTPRoute Deployment Error] ${routeErr.message}`,
            routeErr.stack || routeErr,
          );

          // Rollback: Remove tenant from tfvars since routing failed
          try {
            await this.terraformService.removeTenantFromTfvars(
              sanitizedName,
              environment,
            );
            this.logger.log(
              `Removed ${sanitizedName} from tfvars after HTTPRoute failure`,
            );
          } catch (rollbackErr) {
            this.logger.error(
              `Failed to remove tenant from tfvars during rollback: ${rollbackErr.message}`,
              rollbackErr.stack || rollbackErr,
            );
          }

          throw new InternalServerErrorException({
            success: false,
            tenantId,
            tenantName: sanitizedName,
            tier,
            error: 'Failed to deploy HTTPRoute after Terraform provisioning',
            terraform: terraformResult,
            routing: {
              message: routeErr.message,
              details: routeErr.stack,
            },
            message:
              'Certificate was provisioned but HTTPRoute deployment failed. Tenant entry removed from tfvars.',
          });
        }
      }

      // Success response
      const domain = this.getDomainForTenant(sanitizedName, tier);
      const namespace = tier === TenantTier.ENTERPRISE ? sanitizedName : tier;

      return {
        success: true,
        tenantId,
        tenantName: sanitizedName,
        tier,
        domain,
        namespace,
        infrastructure: {
          terraform: terraformResult,
          deployment: deploymentResult,
        },
        message: 'Infrastructure provisioned successfully',
      };
    } catch (error) {
      this.logger.error(
        `[Provision Error] ${error.message}`,
        error.stack || error,
      );

      // If this is already a formatted error from inner catches, just rethrow
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Otherwise, this is an unexpected error - try to clean up if we added to tfvars
      if (tenantAddedToTfvars) {
        try {
          await this.terraformService.removeTenantFromTfvars(
            sanitizedName,
            environment,
          );
          this.logger.log(
            `Removed ${sanitizedName} from tfvars after unexpected error`,
          );
        } catch (rollbackErr) {
          this.logger.error(
            `Failed to remove tenant from tfvars during rollback: ${rollbackErr.message}`,
            rollbackErr.stack || rollbackErr,
          );
        }
      }

      throw new InternalServerErrorException({
        success: false,
        tenantId,
        tenantName: sanitizedName,
        tier,
        error: error.message,
        details: error.stack,
        message: 'Unexpected error during provisioning. Cleanup attempted.',
      });
    }
  }

  /**
   * Gets the domain URL for a tenant based on tier
   */
  private getDomainForTenant(tenantName: string, tier: string): string {
    const hostname = 'dev.cloudappdev.site';
    return `https://${tenantName}.${hostname}`;
  }
}
