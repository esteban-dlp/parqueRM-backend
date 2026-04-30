import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { CashClosure } from '../database/entities/cash-closure.entity';
import { CashClosureDetail } from '../database/entities/cash-closure-detail.entity';
import { FinancialConcept } from '../database/entities/financial-concept.entity';
import { PaymentMethod } from '../database/entities/payment-method.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { AuditModule } from '../audit/audit.module';
import { CashService } from './cash.service';
import { CashController } from './cash.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialMovement,
      CashClosure,
      CashClosureDetail,
      FinancialConcept,
      PaymentMethod,
      Receipt,
    ]),
    AuditModule,
  ],
  providers: [CashService],
  controllers: [CashController],
  exports: [CashService],
})
export class CashModule {}
