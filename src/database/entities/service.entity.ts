import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'services' })
export class Service {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'code', type: 'varchar', length: 80, unique: true })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;
}
