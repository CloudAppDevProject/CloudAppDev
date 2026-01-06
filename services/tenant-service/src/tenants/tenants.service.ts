import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantUsers(tenantId: number) {
    // Verify tenant exists
    await this.findOne(tenantId);

    // Call User Service to get users by tenantId
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:8080';

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/api/v1/users?tenantId=${tenantId}`)
      );
      return response.data;
    } catch (error) {
      throw new NotFoundException(`Failed to fetch users for tenant ${tenantId}`);
    }
  }

  async create(dto: CreateTenantDto) {
    const maxUsers = this.getTierMaxUsers(dto.tier || 'free');

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        tier: dto.tier || 'free',
        status: 'active',
        maxUsers,
      },
    });
  }

  async update(id: number, dto: UpdateTenantDto) {
    // Check if tenant exists
    await this.findOne(id);

    // If tier is being updated, adjust maxUsers unless explicitly provided
    const updateData = { ...dto };
    if (dto.tier && !dto.maxUsers) {
      updateData.maxUsers = this.getTierMaxUsers(dto.tier);
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number) {
    // Soft delete - set status to inactive
    await this.findOne(id);

    return this.prisma.tenant.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }

  private getTierMaxUsers(tier: string): number {
    const limits = {
      free: 5,
      standard: 50,
      enterprise: 999999,
    };
    return limits[tier] || 5;
  }
}
