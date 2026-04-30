import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { User } from './user.entity';
import { ReceiptLine } from './receipt-line.entity';

@Entity({ name: 'receipts' })
export class Receipt {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'receipt_number', type: 'nvarchar', length: 50, unique: true })
  receiptNumber!: string;

  @Column({ name: 'receipt_date', type: 'datetime2', default: () => 'SYSDATETIME()' })
  receiptDate!: Date;

  @Column({ name: 'contributor_name', type: 'nvarchar', length: 150, nullable: true })
  contributorName!: string | null;

  @Column({ name: 'contributor_document', type: 'nvarchar', length: 80, nullable: true })
  contributorDocument!: string | null;

  @Column({ name: 'contributor_address', type: 'nvarchar', length: 255, nullable: true })
  contributorAddress!: string | null;

  @Column({ name: 'origin_type', type: 'nvarchar', length: 50 })
  originType!: string;

  @Column({ name: 'origin_id', type: 'int', nullable: true })
  originId!: number | null;

  @Column({ name: 'payment_method_id', type: 'int' })
  paymentMethodId!: number;

  @ManyToOne(() => PaymentMethod, { eager: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total!: number;

  @Column({ name: 'amount_received', type: 'decimal', precision: 12, scale: 2, nullable: true })
  amountReceived!: number | null;

  @Column({ name: 'change_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  changeAmount!: number | null;

  @Column({ name: 'payment_reference', type: 'nvarchar', length: 150, nullable: true })
  paymentReference!: string | null;

  @Column({ name: 'status', type: 'nvarchar', length: 30, default: 'ACTIVO' })
  status!: string;

  @Column({ name: 'sicoin_reference', type: 'nvarchar', length: 150, nullable: true })
  sicoinReference!: string | null;

  @Column({ name: 'sicoin_error', type: 'nvarchar', length: 500, nullable: true })
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

  @Column({ name: 'cancelled_at', type: 'datetime2', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'nvarchar', length: 500, nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'SYSDATETIME()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime2', nullable: true })
  updatedAt!: Date | null;

  @OneToMany(() => ReceiptLine, (line) => line.receipt, { cascade: true })
  lines!: ReceiptLine[];
}
