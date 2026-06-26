import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleRecord } from '../database/entities/vehicle-record.entity';
import { VehicleType } from '../database/entities/vehicle-type.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { AuditModule } from '../audit/audit.module';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([VehicleRecord, VehicleType, Tariff, VisitorRecord, Receipt]),
    AuditModule,
  ],
  providers: [VehiclesService],
  controllers: [VehiclesController],
  exports: [VehiclesService],
})
export class VehiclesModule {}
