import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'financial_concepts' })
export class FinancialConcept {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({ name: 'type', type: 'nvarchar', length: 20 })
  type!: 'INGRESO' | 'EGRESO';

  @Column({ name: 'name', type: 'nvarchar', length: 150 })
  name!: string;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'datetime2', nullable: true })
  deletedAt!: Date | null;
}
