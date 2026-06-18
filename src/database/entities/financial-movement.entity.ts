import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FinancialConcept } from './financial-concept.entity';
import { PaymentMethod } from './payment-method.entity';
import { Receipt } from './receipt.entity';
import { CashClosure } from './cash-closure.entity';
import { User } from './user.entity';

@Entity({ name: 'financial_movements' })
export class FinancialMovement {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'movement_type', type: 'varchar', length: 20 })
  movementType!: 'INGRESO' | 'EGRESO';

  @Column({ name: 'concept_id', type: 'int' })
  conceptId!: number;

  @ManyToOne(() => FinancialConcept, { eager: false })
  @JoinColumn({ name: 'concept_id' })
  concept!: FinancialConcept;

  @Column({ name: 'payment_method_id', type: 'int' })
  paymentMethodId!: number;

  @ManyToOne(() => PaymentMethod, { eager: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'origin_type', type: 'varchar', length: 50 })
  originType!: string;

  @Column({ name: 'origin_id', type: 'int', nullable: true })
  originId!: number | null;

  @Column({ name: 'receipt_id', type: 'int', nullable: true })
  receiptId!: number | null;

  @ManyToOne(() => Receipt, { nullable: true, eager: false })
  @JoinColumn({ name: 'receipt_id' })
  receipt!: Receipt | null;

  @Column({ name: 'movement_date', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  movementDate!: Date;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'ACTIVO' })
  status!: string;

  @Column({ name: 'cash_closure_id', type: 'int', nullable: true })
  cashClosureId!: number | null;

  @ManyToOne(() => CashClosure, { nullable: true, eager: false })
  @JoinColumn({ name: 'cash_closure_id' })
  cashClosure!: CashClosure | null;

  @Column({ name: 'created_by_user_id', type: 'int' })
  createdByUserId!: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ name: 'cancelled_by_user_id', type: 'int', nullable: true })
  cancelledByUserId!: number | null;

  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'cancelled_by_user_id' })
  cancelledByUser!: User | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt!: Date | null;
}
