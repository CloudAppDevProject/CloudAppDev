import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { ProvisionTenantResponseDto } from './dto/provision-response.dto';

@Controller()
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('health')
  healthCheck() {
    return {
      status: 'healthy',
      service: 'infrastructure-provisioner',
    };
  }

  @Post('provision-tenant')
  @HttpCode(HttpStatus.OK)
  async provisionTenant(
    @Body() provisionTenantDto: ProvisionTenantDto,
  ): Promise<ProvisionTenantResponseDto> {
    return this.tenantService.provisionTenant(provisionTenantDto);
  }
}
