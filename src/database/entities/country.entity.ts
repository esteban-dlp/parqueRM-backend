import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'countries' })
export class Country {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'name', type: 'nvarchar', length: 120, unique: true })
  name!: string;

  @Column({ name: 'nationality', type: 'nvarchar', length: 120, nullable: true })
  nationality!: string | null;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;
}
