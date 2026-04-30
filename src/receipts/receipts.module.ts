import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from '../database/entities/receipt.entity';
import { ReceiptLine } from '../database/entities/receipt-line.entity';
import { PaymentMethod } from '../database/entities/payment-method.entity';
import { AuditModule } from '../audit/audit.module';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt, ReceiptLine, PaymentMethod]),
    AuditModule,
  ],
  providers: [ReceiptsService],
  controllers: [ReceiptsController],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
