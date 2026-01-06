import { IsInt, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @IsNotEmpty()
  roleId: number;

  @IsInt()
  @IsNotEmpty()
  tenantId: number;
}
