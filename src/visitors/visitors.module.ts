import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { VisitReason } from '../database/entities/visit-reason.entity';
import { VisitActivity } from '../database/entities/visit-activity.entity';
import { VisitorCategory } from '../database/entities/visitor-category.entity';
import { Country } from '../database/entities/country.entity';
import { Department } from '../database/entities/department.entity';
import { Municipality } from '../database/entities/municipality.entity';
import { TravelType } from '../database/entities/travel-type.entity';
import { InfoSource } from '../database/entities/info-source.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { ParkConfig } from '../database/entities/park-config.entity';
import { AuditModule } from '../audit/audit.module';
import { VisitorsService } from './visitors.service';
import { VisitorsController } from './visitors.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitorRecord,
      VisitReason,
      VisitActivity,
      VisitorCategory,
      Country,
      Department,
      Municipality,
      TravelType,
      InfoSource,
      Tariff,
      ParkConfig,
    ]),
    AuditModule,
  ],
  providers: [VisitorsService],
  controllers: [VisitorsController],
  exports: [VisitorsService],
})
export class VisitorsModule {}
