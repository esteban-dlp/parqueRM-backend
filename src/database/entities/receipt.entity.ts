import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { User } from './user.entity';
import { ReceiptLine } from './receipt-line.entity';

@Entity({ name: 'receipts' })
export class Receipt {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'receipt_number', type: 'varchar', length: 50, unique: true })
  receiptNumber!: string;

  @Column({ name: 'receipt_date', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  receiptDate!: Date;

  @Column({ name: 'contributor_name', type: 'varchar', length: 150, nullable: true })
  contributorName!: string | null;

  @Column({ name: 'contributor_document', type: 'varchar', length: 80, nullable: true })
  contributorDocument!: string | null;

  @Column({ name: 'contributor_address', type: 'varchar', length: 255, nullable: true })
  contributorAddress!: string | null;

  @Column({ name: 'origin_type', type: 'varchar', length: 50 })
  originType!: string;

  @Column({ name: 'origin_id', type: 'int', nullable: true })
  originId!: number | null;

  @Column({ name: 'payment_method_id', type: 'int' })
  paymentMethodId!: number;

  @ManyToOne(() => PaymentMethod, { eager: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'subtotal', type: 'decimal', precision: 12, scale: 2, nullable: true })
  subtotal!: number | null;

  @Column({ name: 'discount_type', type: 'varchar', length: 20, nullable: true })
  discountType!: 'PERCENTAGE' | 'AMOUNT' | null;

  @Column({ name: 'discount_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercentage!: number | null;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2, nullable: true, default: 0 })
  discountAmount!: number | null;

  @Column({ name: 'discount_reason', type: 'varchar', length: 500, nullable: true })
  discountReason!: string | null;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ name: 'amount_received', type: 'decimal', precision: 12, scale: 2, nullable: true })
  amountReceived!: number | null;

  @Column({ name: 'change_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  changeAmount!: number | null;

  @Column({ name: 'payment_reference', type: 'varchar', length: 150, nullable: true })
  paymentReference!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30, default: 'ACTIVO' })
  status!: string;

  @Column({ name: 'sicoin_reference', type: 'varchar', length: 150, nullable: true })
  sicoinReference!: string | null;

  @Column({ name: 'sicoin_error', type: 'varchar', length: 500, nullable: true })
  sicoinError!: string | null;

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

  @OneToMany(() => ReceiptLine, (line) => line.receipt, { cascade: true })
  lines!: ReceiptLine[];
}
