import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Department } from './department.entity';

@Entity({ name: 'municipalities' })
export class Municipality {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'department_id', type: 'int' })
  departmentId!: number;

  @ManyToOne(() => Department, { eager: false })
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  @Column({ name: 'name', type: 'nvarchar', length: 120 })
  name!: string;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt!: Date | null;
}
