import { Module } from '@nestjs/common';
import { DeploymentUpdateService } from './deployment-update.service';
import { DeploymentUpdateController } from './deployment-update.controller';

@Module({
  controllers: [DeploymentUpdateController],
  providers: [DeploymentUpdateService],
  exports: [DeploymentUpdateService],
})
export class DeploymentUpdateModule {}
