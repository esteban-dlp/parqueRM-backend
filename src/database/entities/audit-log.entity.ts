import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId!: number | null;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user!: User | null;

  @Column({ name: 'action', type: 'nvarchar', length: 100 })
  action!: string;

  @Column({ name: 'entity_name', type: 'nvarchar', length: 100 })
  entityName!: string;

  @Column({ name: 'entity_id', type: 'nvarchar', length: 100, nullable: true })
  entityId!: string | null;

  @Column({ name: 'old_values', type: 'nvarchar', nullable: true })
  oldValues!: string | null;

  @Column({ name: 'new_values', type: 'nvarchar', nullable: true })
  newValues!: string | null;

  @Column({ name: 'ip_address', type: 'nvarchar', length: 80, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'created_at', type: 'datetime2', default: () => 'SYSDATETIME()' })
  createdAt!: Date;
}
