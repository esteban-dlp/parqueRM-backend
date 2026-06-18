import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'park_config' })
export class ParkConfig {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'park_name', type: 'varchar', length: 150 })
  parkName!: string;

  @Column({ name: 'park_subtitle', type: 'varchar', length: 150, nullable: true })
  parkSubtitle!: string | null;

  @Column({ name: 'sigap_code', type: 'varchar', length: 80, nullable: true })
  sigapCode!: string | null;

  @Column({ name: 'department', type: 'varchar', length: 100, nullable: true })
  department!: string | null;

  @Column({ name: 'municipality', type: 'varchar', length: 100, nullable: true })
  municipality!: string | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'system_lan_url', type: 'varchar', length: 255, nullable: true })
  systemLanUrl!: string | null;

  @Column({ name: 'max_capacity', type: 'int', default: 150 })
  maxCapacity!: number;

  @Column({ name: 'sidebar_color_hex', type: 'varchar', length: 7, nullable: true })
  sidebarColorHex!: string | null;

  @Column({ name: 'ticket_version', type: 'varchar', length: 50, nullable: true })
  ticketVersion!: string | null;

  @Column({ name: 'ruv', type: 'varchar', length: 80, nullable: true })
  ruv!: string | null;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt!: Date | null;
}
