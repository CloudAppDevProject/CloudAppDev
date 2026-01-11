import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class TenantLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
