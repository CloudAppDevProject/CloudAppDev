import { Module } from '@nestjs/common';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}
