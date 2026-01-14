import { Module } from '@nestjs/common';
import { TerraformService } from './terraform.service';

@Module({
  providers: [TerraformService],
  exports: [TerraformService],
})
export class TerraformModule {}
