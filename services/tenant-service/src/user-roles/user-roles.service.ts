import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class UserRolesService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: number) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
        tenant: true,
      },
    });

    return userRoles;
  }

  async assignRole(userId: number, roleId: number, tenantId: number) {
    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    // Check if user already has a role in this tenant
    const existingUserRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        tenantId,
      },
    });

    if (existingUserRole) {
      // Update existing role instead of creating duplicate
      return this.prisma.userRole.update({
        where: { id: existingUserRole.id },
        data: { roleId },
        include: {
          role: true,
          tenant: true,
        },
      });
    }

    // Create new user role if none exists
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        tenantId,
      },
      include: {
        role: true,
        tenant: true,
      },
    });
  }

  async removeRole(id: number) {
    // Verify userRole exists
    const userRole = await this.prisma.userRole.findUnique({
      where: { id },
    });

    if (!userRole) {
      throw new NotFoundException(`UserRole with ID ${id} not found`);
    }

    return this.prisma.userRole.delete({
      where: { id },
    });
  }
}
