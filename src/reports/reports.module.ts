import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { VehicleRecord } from '../database/entities/vehicle-record.entity';
import { LodgingRecord } from '../database/entities/lodging-record.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { CashClosure } from '../database/entities/cash-closure.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VisitorRecord,
      VehicleRecord,
      LodgingRecord,
      FinancialMovement,
      CashClosure,
      Receipt,
    ]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
