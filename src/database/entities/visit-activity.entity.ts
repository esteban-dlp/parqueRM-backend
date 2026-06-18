import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'visit_activities' })
export class VisitActivity {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}
