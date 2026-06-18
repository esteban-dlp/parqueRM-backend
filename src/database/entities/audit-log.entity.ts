import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: User | null;

  @Column({ name: 'action', type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'entity_name', type: 'varchar', length: 100 })
  entityName!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100, nullable: true })
  entityId!: string | null;

  @Column({ name: 'old_values', type: 'varchar', nullable: true })
  oldValues!: string | null;

  @Column({ name: 'new_values', type: 'varchar', nullable: true })
  newValues!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 80, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
