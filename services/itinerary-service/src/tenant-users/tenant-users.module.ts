import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TenantUsersService } from './tenant-users.service';

@Module({
  imports: [HttpModule],
  providers: [TenantUsersService],
  exports: [TenantUsersService],
})
export class TenantUsersModule {}
