import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkConfig } from '../database/entities/park-config.entity';
import { Service } from '../database/entities/service.entity';
import { ParkConfigService } from './park-config.service';
import { ParkConfigController } from './park-config.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParkConfig, Service]), AuditModule],
  providers: [ParkConfigService],
  controllers: [ParkConfigController],
  exports: [ParkConfigService],
})
export class ParkConfigModule {}
