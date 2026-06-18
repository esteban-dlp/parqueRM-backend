import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LodgingType } from './lodging-type.entity';
import { Tariff } from './tariff.entity';
import { User } from './user.entity';

@Entity({ name: 'lodging_records' })
export class LodgingRecord {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'lodging_type_id', type: 'int' })
  lodgingTypeId!: number;

  @ManyToOne(() => LodgingType, { eager: false })
  @JoinColumn({ name: 'lodging_type_id' })
  lodgingType!: LodgingType;

  @Column({ name: 'record_date', type: 'date' })
  recordDate!: string;

  @Column({ name: 'nights', type: 'int' })
  nights!: number;

  @Column({ name: 'guests', type: 'int' })
  guests!: number;

  @Column({ name: 'tariff_id', type: 'int', nullable: true })
  tariffId!: number | null;

  @ManyToOne(() => Tariff, { nullable: true, eager: false })
  @JoinColumn({ name: 'tariff_id' })
  tariff!: Tariff | null;

  @Column({ name: 'applied_rate', type: 'decimal', precision: 12, scale: 2 })
  appliedRate!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column({ name: 'is_foreign', type: 'boolean', default: false })
  isForeign!: boolean;

  @Column({ name: 'observations', type: 'varchar', length: 500, nullable: true })
  observations!: string | null;

  @Column({ name: 'created_by_user_id', type: 'int' })
  createdByUserId!: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt!: Date | null;
}
