import {
  IsString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum TenantTier {
  FREE = 'free',
  STANDARD = 'standard',
  ENTERPRISE = 'enterprise',
}

// Reserved namespaces that cannot be used
export const RESERVED_NAMESPACES = [
  'default',
  'kube-system',
  'kube-public',
  'kube-node-lease',
  'cloudappdev',
  'free',
  'standard',
  'enterprise',
  'admin',
  'api',
  'www',
  'app',
  'hub',
  'mail',
  'ftp',
];

export class RegisterTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message:
      'Namespace must be lowercase alphanumeric, can contain hyphens (not at start/end), min 3 chars',
  })
  namespace: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsEnum(TenantTier)
  @IsNotEmpty()
  tier: TenantTier;
}
