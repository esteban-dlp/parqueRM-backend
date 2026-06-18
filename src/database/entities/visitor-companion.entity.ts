import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VisitorRecord } from './visitor-record.entity';
import { VisitorCategory } from './visitor-category.entity';

@Entity({ name: 'visitor_record_companions' })
export class VisitorCompanion {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'visitor_record_id', type: 'int' })
  visitorRecordId!: number;

  @ManyToOne(() => VisitorRecord, (vr) => vr.companions, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'visitor_record_id' })
  visitorRecord!: VisitorRecord;

  @Column({ name: 'visitor_category_id', type: 'int' })
  visitorCategoryId!: number;

  @ManyToOne(() => VisitorCategory, { eager: false })
  @JoinColumn({ name: 'visitor_category_id' })
  visitorCategory!: VisitorCategory;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity!: number;

  @Column({ name: 'applied_rate', type: 'decimal', precision: 12, scale: 2 })
  appliedRate!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column({ name: 'is_foreign', type: 'boolean', default: false })
  isForeign!: boolean;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
