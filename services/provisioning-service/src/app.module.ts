import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenant/tenant.module';
import { TerraformModule } from './terraform/terraform.module';
import { DeploymentUpdateModule } from './deployment-update/deployment-update.module';
import { StartupSyncService } from './startup/startup-sync.service';

@Module({
  imports: [
    HttpModule.register({ timeout: 10000 }),
    TenantModule,
    TerraformModule,
    DeploymentUpdateModule,
  ],
  controllers: [AppController],
  providers: [AppService, StartupSyncService],
})
export class AppModule {}
