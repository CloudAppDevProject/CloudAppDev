import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TerraformModule } from '../terraform/terraform.module';
import { KubernetesModule } from '../kubernetes/kubernetes.module';

@Module({
  imports: [TerraformModule, KubernetesModule],
  controllers: [TenantController],
  providers: [TenantService],
  exports: [TenantService],
})
export class TenantModule {}
