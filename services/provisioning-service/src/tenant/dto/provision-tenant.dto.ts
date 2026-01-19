import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum TenantTier {
  FREE = 'free',
  STANDARD = 'standard',
  ENTERPRISE = 'enterprise',
}

export class ProvisionTenantDto {
  @IsString()
  tenantId: string;

  @IsString()
  tenantName: string;

  @IsEnum(TenantTier)
  tier: TenantTier;

  @IsString()
  @IsOptional()
  environment?: string = 'dev';
}
