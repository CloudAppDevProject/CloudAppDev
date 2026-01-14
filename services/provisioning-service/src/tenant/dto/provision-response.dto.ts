export interface TerraformResult {
  success: boolean;
  output?: string;
  errors?: string;
}

export interface DeploymentResult {
  service: string;
  success: boolean;
  output?: string;
  warnings?: string;
  error?: string;
  stderr?: string;
  stdout?: string;
}

export interface KubernetesDeploymentResult {
  namespace: string;
  infrastructure: any;
  deployments: DeploymentResult[];
}

export class ProvisionTenantResponseDto {
  success: boolean;
  tenantId?: number;
  tenantName?: string;
  tier?: string;
  domain?: string;
  namespace?: string;
  infrastructure?: {
    terraform: TerraformResult;
    deployment?: KubernetesDeploymentResult;
  };
  message?: string;
  error?: string;
  details?: any;
}
