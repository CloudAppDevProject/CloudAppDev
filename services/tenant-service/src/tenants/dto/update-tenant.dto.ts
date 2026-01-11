import { IsString, IsOptional, IsEnum, IsInt, IsEmail } from 'class-validator';

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

  // Optional owner email (used when migrating/upgrading users to tenant owners)
  @IsOptional()
  @IsEmail()
  email?: string;
}
