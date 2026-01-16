import { IsInt, IsString, IsEnum, IsOptional } from 'class-validator';

export enum TenantTier {
  FREE = 'free',
  STANDARD = 'standard',
  ENTERPRISE = 'enterprise',
}

export class ProvisionTenantDto {
  @IsInt()
  tenantId: number;

  @IsString()
  tenantName: string;

  @IsEnum(TenantTier)
  tier: TenantTier;

  @IsString()
  @IsOptional()
  environment?: string = 'dev';
}
