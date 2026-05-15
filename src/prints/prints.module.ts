import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { CashClosure } from '../database/entities/cash-closure.entity';
import { ReceiptLine } from '../database/entities/receipt-line.entity';
import { CashClosureDetail } from '../database/entities/cash-closure-detail.entity';
import { ParkConfig } from '../database/entities/park-config.entity';
import { PrintsController } from './prints.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitorRecord, Receipt, CashClosure, ReceiptLine, CashClosureDetail, ParkConfig]),
  ],
  controllers: [PrintsController],
})
export class PrintsModule {}
