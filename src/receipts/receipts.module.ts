import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from '../database/entities/receipt.entity';
import { ReceiptLine } from '../database/entities/receipt-line.entity';
import { PaymentMethod } from '../database/entities/payment-method.entity';
import { FinancialConcept } from '../database/entities/financial-concept.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { AuditModule } from '../audit/audit.module';
import { CashModule } from '../cash/cash.module';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptLine, PaymentMethod, FinancialConcept, FinancialMovement]),
    AuditModule,
    CashModule,
  ],
  providers: [ReceiptsService],
  controllers: [ReceiptsController],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
