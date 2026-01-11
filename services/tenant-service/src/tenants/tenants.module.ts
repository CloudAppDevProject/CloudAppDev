import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantAuthModule } from '../auth/tenant-auth.module';
import { AdminGuard } from '../guards/admin.guard';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    PrismaModule,
    TenantAuthModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService, AdminGuard],
  exports: [TenantsService, AdminGuard],
})
export class TenantsModule {}
