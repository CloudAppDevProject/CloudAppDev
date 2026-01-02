import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { TenantTier } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEnum(TenantTier)
  tier: TenantTier;

  @IsEmail()
  ownerEmail: string;

  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @IsString()
  @IsNotEmpty()
  ownerFirebaseUid: string;
}
