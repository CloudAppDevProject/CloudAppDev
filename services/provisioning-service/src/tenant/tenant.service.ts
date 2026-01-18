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

    try {
      // Step 1: Update tenants.tfvars with new tenant
      await this.terraformService.addTenantToTfvars(
        sanitizedName,
        tier,
        environment,
      );

      // Step 2: Run Terraform apply
      const terraformResult =
        await this.terraformService.runTerraformApply(environment);

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
          this.logger.error('[K8s Deployment Error]', deployErr);

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
              'Infrastructure was provisioned but Kubernetes deployment failed. Manual intervention required.',
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
          this.logger.error('[HTTPRoute Deployment Error]', routeErr);

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
              'Certificate was provisioned but HTTPRoute deployment failed. Manual intervention required.',
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
      this.logger.error('[Provision Error]', error);
      throw new InternalServerErrorException({
        success: false,
        error: error.message,
        details: error.stack,
      });
    }
  }

  /**
   * Gets the domain URL for a tenant based on tier
   */
  private getDomainForTenant(tenantName: string, tier: string): string {
    const hostname = 'cloudappdev.site';
    return `https://${tenantName}.${hostname}`;
  }
}
