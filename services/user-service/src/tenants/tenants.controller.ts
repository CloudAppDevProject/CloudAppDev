import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('register')
  async registerTenant(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto, dto.ownerFirebaseUid);
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.getTenant(parseInt(id));
  }

  @Get('slug/:slug')
  async getTenantBySlug(@Param('slug') slug: string) {
    return this.tenantsService.getTenantBySlug(slug);
  }
}
