import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from '../database/entities/tariff.entity';
import { Service } from '../database/entities/service.entity';
import { VisitorCategory } from '../database/entities/visitor-category.entity';
import { VehicleType } from '../database/entities/vehicle-type.entity';
import { LodgingType } from '../database/entities/lodging-type.entity';
import { TariffsService } from './tariffs.service';
import { TariffsController } from './tariffs.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tariff, Service, VisitorCategory, VehicleType, LodgingType]),
    AuditModule,
  ],
  providers: [TariffsService],
  controllers: [TariffsController],
  exports: [TariffsService],
})
export class TariffsModule {}
