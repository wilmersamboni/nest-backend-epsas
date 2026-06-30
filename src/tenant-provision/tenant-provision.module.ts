import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantProvisionService } from './tenant-provision.service';
import { TenantProvisionController } from './tenant-provision.controller';

@Module({
  imports: [ConfigModule],
  controllers: [TenantProvisionController],
  providers: [TenantProvisionService],
})
export class TenantProvisionModule {}
