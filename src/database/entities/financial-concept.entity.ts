import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'financial_concepts' })
export class FinancialConcept {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'type', type: 'varchar', length: 20 })
  type!: 'INGRESO' | 'EGRESO';

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date | null;
}
