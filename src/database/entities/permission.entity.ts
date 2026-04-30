import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'permissions' })
export class Permission {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'code', type: 'nvarchar', length: 100, unique: true })
  code!: string;

  @Column({ name: 'name', type: 'nvarchar', length: 150 })
  name!: string;

  @Column({ name: 'module', type: 'nvarchar', length: 100 })
  module!: string;

  @Column({ name: 'description', type: 'nvarchar', length: 255, nullable: true })
  description!: string | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
