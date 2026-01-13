import { Module } from '@nestjs/common';
import { ItinerariesService } from './itineraries.service';
import { ItinerariesController } from './itineraries.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TenantUsersModule } from '../tenant-users/tenant-users.module';
import { TenantModule } from '../tenant/tenant.module';
import { AdminGuard } from '../guards/admin.guard';

@Module({
  imports: [PrismaModule, StorageModule, TenantUsersModule, TenantModule],
  controllers: [ItinerariesController],
  providers: [ItinerariesService, AdminGuard],
  exports: [ItinerariesService],
})
export class ItinerariesModule {}
