import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';

enum TenantTier {
  FREE = 'free',
  STANDARD = 'standard',
  ENTERPRISE = 'enterprise',
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(TenantTier)
  tier?: string;
}
