import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Service } from './service.entity';
import { VisitorCategory } from './visitor-category.entity';
import { VehicleType } from './vehicle-type.entity';
import { LodgingType } from './lodging-type.entity';

@Entity({ name: 'tariffs' })
export class Tariff {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'service_id', type: 'int' })
  serviceId!: number;

  @ManyToOne(() => Service, { eager: false })
  @JoinColumn({ name: 'service_id' })
  service!: Service;

  @Column({ name: 'visitor_category_id', type: 'int', nullable: true })
  visitorCategoryId!: number | null;

  @ManyToOne(() => VisitorCategory, { nullable: true, eager: false })
  @JoinColumn({ name: 'visitor_category_id' })
  visitorCategory!: VisitorCategory | null;

  @Column({ name: 'vehicle_type_id', type: 'int', nullable: true })
  vehicleTypeId!: number | null;

  @ManyToOne(() => VehicleType, { nullable: true, eager: false })
  @JoinColumn({ name: 'vehicle_type_id' })
  vehicleType!: VehicleType | null;

  @Column({ name: 'lodging_type_id', type: 'int', nullable: true })
  lodgingTypeId!: number | null;

  @ManyToOne(() => LodgingType, { nullable: true, eager: false })
  @JoinColumn({ name: 'lodging_type_id' })
  lodgingType!: LodgingType | null;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'applies_to', type: 'varchar', length: 50 })
  appliesTo!: 'VISITANTE' | 'VEHICULO' | 'HOSPEDAJE' | 'SERVICIO';

  @Column({ name: 'amount_local', type: 'decimal', precision: 12, scale: 2 })
  amountLocal!: number;

  @Column({ name: 'amount_foreign', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amountForeign!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'valid_from', type: 'date' })
  validFrom!: string;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo!: string | null;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}
