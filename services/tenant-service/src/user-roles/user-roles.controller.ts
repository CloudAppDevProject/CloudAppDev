import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { TenantAuthGuard } from '../guards/tenant-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller('user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  // Public endpoint for service-to-service communication (User Service needs this during login)
  @Get('user/:userId')
  async findByUserId(@Param('userId', ParseIntPipe) userId: number) {
    return this.userRolesService.findByUserId(userId);
  }

  @Post()
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.userRolesService.assignRole(
      assignRoleDto.userId,
      assignRoleDto.roleId,
      assignRoleDto.tenantId,
    );
  }

  @Delete(':id')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async removeRole(@Param('id', ParseIntPipe) id: number) {
    return this.userRolesService.removeRole(id);
  }
}
