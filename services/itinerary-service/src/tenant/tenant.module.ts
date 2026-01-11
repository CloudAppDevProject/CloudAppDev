import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TenantService } from './tenant.service';

@Module({
  imports: [HttpModule],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
