import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CashClosure } from './cash-closure.entity';

@Entity({ name: 'cash_closure_details' })
export class CashClosureDetail {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'cash_closure_id', type: 'int' })
  cashClosureId!: number;

  @ManyToOne(() => CashClosure, (c) => c.details, { eager: false })
  @JoinColumn({ name: 'cash_closure_id' })
  cashClosure!: CashClosure;

  @Column({ name: 'detail_type', type: 'varchar', length: 50 })
  detailType!: 'MEDIO_PAGO' | 'SERVICIO' | 'CONCEPTO';

  @Column({ name: 'label', type: 'varchar', length: 150 })
  label!: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;
}
