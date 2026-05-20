import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VisitorCompanion } from './visitor-companion.entity';
import { Country } from './country.entity';
import { Department } from './department.entity';
import { Municipality } from './municipality.entity';
import { InfoSource } from './info-source.entity';
import { TravelType } from './travel-type.entity';
import { VisitorCategory } from './visitor-category.entity';
import { Tariff } from './tariff.entity';
import { User } from './user.entity';
import { VisitReason } from './visit-reason.entity';
import { VisitActivity } from './visit-activity.entity';

@Entity({ name: 'visitor_records' })
export class VisitorRecord {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'ticket_number', type: 'nvarchar', length: 50, unique: true })
  ticketNumber!: string;

  @Column({ name: 'record_date', type: 'date' })
  recordDate!: string;

  @Column({ name: 'check_in_at', type: 'datetime2', default: () => 'SYSDATETIME()' })
  checkInAt!: Date;

  @Column({ name: 'check_out_at', type: 'datetime2', nullable: true })
  checkOutAt!: Date | null;

  @Column({ name: 'country_id', type: 'int', nullable: true })
  countryId!: number | null;

  @ManyToOne(() => Country, { nullable: true, eager: false })
  @JoinColumn({ name: 'country_id' })
  country!: Country | null;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId!: number | null;

  @ManyToOne(() => Department, { nullable: true, eager: false })
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @Column({ name: 'municipality_id', type: 'int', nullable: true })
  municipalityId!: number | null;

  @ManyToOne(() => Municipality, { nullable: true, eager: false })
  @JoinColumn({ name: 'municipality_id' })
  municipality!: Municipality | null;

  @Column({ name: 'info_source_id', type: 'int', nullable: true })
  infoSourceId!: number | null;

  @ManyToOne(() => InfoSource, { nullable: true, eager: false })
  @JoinColumn({ name: 'info_source_id' })
  infoSource!: InfoSource | null;

  @Column({ name: 'travel_type_id', type: 'int', nullable: true })
  travelTypeId!: number | null;

  @ManyToOne(() => TravelType, { nullable: true, eager: false })
  @JoinColumn({ name: 'travel_type_id' })
  travelType!: TravelType | null;

  @Column({ name: 'nationality', type: 'nvarchar', length: 120, nullable: true })
  nationality!: string | null;

  @Column({ name: 'identification_type', type: 'nvarchar', length: 50, nullable: true })
  identificationType!: string | null;

  @Column({ name: 'identification_number', type: 'nvarchar', length: 80, nullable: true })
  identificationNumber!: string | null;

  @Column({ name: 'full_name', type: 'nvarchar', length: 150, nullable: true })
  fullName!: string | null;

  @Column({ name: 'email', type: 'nvarchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'gender', type: 'nvarchar', length: 20, nullable: true })
  gender!: string | null;

  @Column({ name: 'age_range', type: 'nvarchar', length: 20, nullable: true })
  ageRange!: string | null;

  @Column({ name: 'visitor_category_id', type: 'int' })
  visitorCategoryId!: number;

  @ManyToOne(() => VisitorCategory, { eager: false })
  @JoinColumn({ name: 'visitor_category_id' })
  visitorCategory!: VisitorCategory;

  @Column({ name: 'quantity', type: 'int', default: 1 })
  quantity!: number;

  @Column({ name: 'tariff_id', type: 'int', nullable: true })
  tariffId!: number | null;

  @ManyToOne(() => Tariff, { nullable: true, eager: false })
  @JoinColumn({ name: 'tariff_id' })
  tariff!: Tariff | null;

  @Column({ name: 'applied_rate', type: 'decimal', precision: 12, scale: 2 })
  appliedRate!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column({ name: 'visit_type', type: 'nvarchar', length: 50, nullable: true })
  visitType!: string | null;

  @Column({ name: 'observations', type: 'nvarchar', length: 500, nullable: true })
  observations!: string | null;

  @Column({ name: 'is_foreign', type: 'bit', default: false })
  isForeign!: boolean;

  @Column({ name: 'source', type: 'nvarchar', length: 50, default: 'MANUAL' })
  source!: string;

  @Column({ name: 'external_event_id', type: 'nvarchar', length: 100, nullable: true })
  externalEventId!: string | null;

  @Column({ name: 'created_by_user_id', type: 'int' })
  createdByUserId!: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'SYSDATETIME()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime2', nullable: true })
  updatedAt!: Date | null;

  @ManyToMany(() => VisitReason)
  @JoinTable({
    name: 'visitor_record_reasons',
    joinColumn: { name: 'visitor_record_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'visit_reason_id', referencedColumnName: 'id' },
  })
  visitReasons!: VisitReason[];

  @ManyToMany(() => VisitActivity)
  @JoinTable({
    name: 'visitor_record_activities',
    joinColumn: { name: 'visitor_record_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'visit_activity_id', referencedColumnName: 'id' },
  })
  visitActivities!: VisitActivity[];

  @OneToMany(() => VisitorCompanion, (c) => c.visitorRecord, { cascade: ['insert'] })
  companions!: VisitorCompanion[];
}
