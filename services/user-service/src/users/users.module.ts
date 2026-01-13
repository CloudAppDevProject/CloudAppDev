import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TenantModule } from '../tenant/tenant.module';
import { AdminGuard } from '../guards/admin.guard';

@Module({
  imports: [PrismaModule, StorageModule, TenantModule],
  controllers: [UsersController],
  providers: [UsersService, AdminGuard],
  exports: [UsersService, AdminGuard],
})
export class UsersModule {}
