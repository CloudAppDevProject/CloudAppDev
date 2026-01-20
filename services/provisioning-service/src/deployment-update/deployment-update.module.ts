import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeploymentUpdateService } from './deployment-update.service';
import { DeploymentUpdateController } from './deployment-update.controller';

@Module({
  imports: [HttpModule.register({ timeout: 10000 })],
  controllers: [DeploymentUpdateController],
  providers: [DeploymentUpdateService],
  exports: [DeploymentUpdateService],
})
export class DeploymentUpdateModule {}
