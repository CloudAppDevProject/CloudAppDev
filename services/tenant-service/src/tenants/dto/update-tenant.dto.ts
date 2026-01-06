import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';

enum TenantTier {
  FREE = 'free',
  STANDARD = 'standard',
  ENTERPRISE = 'enterprise',
}

enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(TenantTier)
  tier?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: string;

  @IsOptional()
  @IsInt()
  maxUsers?: number;
}
