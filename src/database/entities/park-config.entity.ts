import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'park_config' })
export class ParkConfig {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'park_name', type: 'nvarchar', length: 150 })
  parkName!: string;

  @Column({ name: 'park_subtitle', type: 'nvarchar', length: 150, nullable: true })
  parkSubtitle!: string | null;

  @Column({ name: 'sigap_code', type: 'nvarchar', length: 80, nullable: true })
  sigapCode!: string | null;

  @Column({ name: 'department', type: 'nvarchar', length: 100, nullable: true })
  department!: string | null;

  @Column({ name: 'municipality', type: 'nvarchar', length: 100, nullable: true })
  municipality!: string | null;

  @Column({ name: 'address', type: 'nvarchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ name: 'phone', type: 'nvarchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ name: 'email', type: 'nvarchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'logo_url', type: 'nvarchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'system_lan_url', type: 'nvarchar', length: 255, nullable: true })
  systemLanUrl!: string | null;

  @Column({ name: 'max_capacity', type: 'int', default: 150 })
  maxCapacity!: number;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'SYSDATETIME()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime2', nullable: true })
  updatedAt!: Date | null;
}
