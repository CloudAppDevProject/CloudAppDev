import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantAuthGuard } from '../guards/tenant-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get(':id')
  @UseGuards(TenantAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  @Get(':id/users')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async getTenantUsers(@Param('id', ParseIntPipe) tenantId: number) {
    return this.tenantsService.getTenantUsers(tenantId);
  }

  @Post()
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Patch(':id')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.delete(id);
  }
}
