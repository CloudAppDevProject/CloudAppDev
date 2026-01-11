import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { TenantAuthGuard } from '../guards/tenant-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { TenantAuthService } from '../auth/tenant-auth.service';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantAuthService: TenantAuthService,
  ) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * Register a new tenant (Hub only)
   * POST /api/v1/tenants/register
   */
  @Post('register')
  async register(@Body() registerTenantDto: RegisterTenantDto) {
    return this.tenantsService.register(registerTenantDto);
  }

  /**
   * Check if namespace is available (Hub only)
   * GET /api/v1/tenants/namespace/:namespace/check
   */
  @Get('namespace/:namespace/check')
  async checkNamespace(@Param('namespace') namespace: string) {
    return this.tenantsService.checkNamespaceAvailability(namespace);
  }

  /**
   * Get tenant by namespace (public info only)
   * GET /api/v1/tenants/namespace/:namespace
   */
  @Get('namespace/:namespace')
  async findByNamespace(@Param('namespace') namespace: string) {
    return this.tenantsService.findByNamespace(namespace);
  }

  /**
   * Tenant admin login
   * POST /api/v1/tenants/auth/login
   */
  @Post('auth/login')
  async login(@Body() loginDto: TenantLoginDto) {
    return this.tenantAuthService.login(loginDto.email, loginDto.password);
  }

  /**
   * Check if email is a tenant admin (internal service-to-service call)
   * GET /api/v1/tenants/check-admin-email/:email
   */
  @Get('check-admin-email/:email')
  async checkAdminEmail(@Param('email') email: string) {
    return this.tenantsService.checkAdminEmail(email);
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  /**
   * Get tenant by UUID
   * GET /api/v1/tenants/:uuid
   */
  @Get(':uuid')
  @UseGuards(TenantAuthGuard)
  async findOne(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.tenantsService.findByUuid(uuid);
  }

  /**
   * Get users for a tenant
   * GET /api/v1/tenants/:uuid/users
   */
  @Get(':uuid/users')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async getTenantUsers(@Param('uuid', ParseUUIDPipe) tenantUuid: string) {
    return this.tenantsService.getTenantUsers(tenantUuid);
  }

  /**
   * Create a new tenant (internal/admin use)
   * POST /api/v1/tenants
   */
  @Post()
  async create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  /**
   * Update tenant
   * PATCH /api/v1/tenants/:uuid
   */
  @Patch(':uuid')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(uuid, updateTenantDto);
  }

  /**
   * Delete tenant
   * DELETE /api/v1/tenants/:uuid
   */
  @Delete(':uuid')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async delete(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.tenantsService.delete(uuid);
  }
}
