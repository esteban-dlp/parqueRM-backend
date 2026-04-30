import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'vehicle_types' })
export class VehicleType {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'name', type: 'nvarchar', length: 120, unique: true })
  name!: string;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;
}
