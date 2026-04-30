import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'services' })
export class Service {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'code', type: 'nvarchar', length: 80, unique: true })
  code!: string;

  @Column({ name: 'name', type: 'nvarchar', length: 120 })
  name!: string;

  @Column({ name: 'is_enabled', type: 'bit', default: true })
  isEnabled!: boolean;
}
