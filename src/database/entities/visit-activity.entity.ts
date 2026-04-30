import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'visit_activities' })
export class VisitActivity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'name', type: 'nvarchar', length: 120, unique: true })
  name!: string;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;
}
