import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeploymentUpdateService } from './deployment-update.service';
import { DeploymentUpdateController } from './deployment-update.controller';
import { KubernetesModule } from '../kubernetes/kubernetes.module';

@Module({
  imports: [HttpModule.register({ timeout: 10000 }), KubernetesModule],
  controllers: [DeploymentUpdateController],
  providers: [DeploymentUpdateService],
  exports: [DeploymentUpdateService],
})
export class DeploymentUpdateModule {}
