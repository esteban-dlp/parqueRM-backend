import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'departments' })
export class Department {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'name', type: 'nvarchar', length: 120, unique: true })
  name!: string;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt!: Date | null;

  @OneToMany('Municipality', 'department', { lazy: true })
  municipalities!: Promise<any[]>;
}
