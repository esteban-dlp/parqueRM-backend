import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'role_id', type: 'int' })
  roleId!: number;

  @ManyToOne(() => Role, (role) => role.users, { eager: false })
  @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
  role!: Role;

  @Column({ name: 'username', type: 'nvarchar', length: 80, unique: true })
  username!: string;

  @Column({
    name: 'password_hash',
    type: 'nvarchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'nvarchar', length: 150 })
  fullName!: string;

  @Column({ name: 'email', type: 'nvarchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'last_login_at', type: 'datetime2', nullable: true })
  lastLoginAt!: Date | null;

  @Column({
    name: 'created_at',
    type: 'datetime2',
    default: () => 'SYSDATETIME()',
  })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime2', nullable: true })
  updatedAt!: Date | null;

  @Column({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt!: Date | null;
}
