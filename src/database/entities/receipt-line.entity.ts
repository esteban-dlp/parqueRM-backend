import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FinancialConcept } from './financial-concept.entity';
import { Receipt } from './receipt.entity';

@Entity({ name: 'receipt_lines' })
export class ReceiptLine {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'receipt_id', type: 'int' })
  receiptId!: number;

  @ManyToOne(() => Receipt, (r) => r.lines, { eager: false })
  @JoinColumn({ name: 'receipt_id' })
  receipt!: Receipt;

  @Column({ name: 'concept_id', type: 'int', nullable: true })
  conceptId!: number | null;

  @ManyToOne(() => FinancialConcept, { nullable: true, eager: false })
  @JoinColumn({ name: 'concept_id' })
  concept!: FinancialConcept | null;

  @Column({ name: 'origin_type', type: 'varchar', length: 50, nullable: true })
  originType!: string | null;

  @Column({ name: 'origin_id', type: 'int', nullable: true })
  originId!: number | null;

  @Column({ name: 'description', type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'quantity', type: 'decimal', precision: 12, scale: 2, default: 1 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'total', type: 'decimal', precision: 12, scale: 2 })
  total!: number;
}
