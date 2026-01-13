import { Module } from '@nestjs/common';
import { TenantAuthService } from './tenant-auth.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TenantAuthService],
  exports: [TenantAuthService],
})
export class TenantAuthModule {}
