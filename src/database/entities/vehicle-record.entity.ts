import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { VehicleType } from './vehicle-type.entity';
import { VisitorRecord } from './visitor-record.entity';
import { Tariff } from './tariff.entity';
import { User } from './user.entity';

@Entity({ name: 'vehicle_records' })
export class VehicleRecord {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'vehicle_type_id', type: 'int' })
  vehicleTypeId!: number;

  @ManyToOne(() => VehicleType, { eager: false })
  @JoinColumn({ name: 'vehicle_type_id' })
  vehicleType!: VehicleType;

  @Column({ name: 'visitor_record_id', type: 'int', nullable: true })
  visitorRecordId!: number | null;

  @ManyToOne(() => VisitorRecord, { nullable: true, eager: false })
  @JoinColumn({ name: 'visitor_record_id' })
  visitorRecord!: VisitorRecord | null;

  @Column({ name: 'plate_number', type: 'varchar', length: 30, nullable: true })
  plateNumber!: string | null;

  @Column({ name: 'check_in_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  checkInAt!: Date;

  @Column({ name: 'check_out_at', type: 'datetime', nullable: true })
  checkOutAt!: Date | null;

  @Column({ name: 'tariff_id', type: 'int', nullable: true })
  tariffId!: number | null;

  @ManyToOne(() => Tariff, { nullable: true, eager: false })
  @JoinColumn({ name: 'tariff_id' })
  tariff!: Tariff | null;

  @Column({ name: 'applied_rate', type: 'decimal', precision: 12, scale: 2 })
  appliedRate!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column({ name: 'exit_enabled', type: 'boolean', default: false })
  exitEnabled!: boolean;

  @Column({ name: 'is_foreign', type: 'boolean', default: false })
  isForeign!: boolean;

  @Column({ name: 'source', type: 'varchar', length: 50, default: 'MANUAL' })
  source!: string;

  @Column({ name: 'external_event_id', type: 'varchar', length: 100, nullable: true })
  externalEventId!: string | null;

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
