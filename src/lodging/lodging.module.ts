import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LodgingRecord } from '../database/entities/lodging-record.entity';
import { LodgingType } from '../database/entities/lodging-type.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { AuditModule } from '../audit/audit.module';
import { LodgingService } from './lodging.service';
import { LodgingController } from './lodging.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LodgingRecord, LodgingType, Tariff]),
    AuditModule,
  ],
  providers: [LodgingService],
  controllers: [LodgingController],
  exports: [LodgingService],
})
export class LodgingModule {}
