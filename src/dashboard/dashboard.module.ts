import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { VehicleRecord } from '../database/entities/vehicle-record.entity';
import { LodgingRecord } from '../database/entities/lodging-record.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { ParkConfig } from '../database/entities/park-config.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitorRecord,
      VehicleRecord,
      LodgingRecord,
      FinancialMovement,
      ParkConfig,
    ]),
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
