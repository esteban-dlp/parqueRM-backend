import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { CashClosureDetail } from './cash-closure-detail.entity';

@Entity({ name: 'cash_closures' })
export class CashClosure {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'closure_number', type: 'varchar', length: 50, unique: true })
  closureNumber!: string;

  @Column({ name: 'closed_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  closedAt!: Date;

  @Column({ name: 'total_income', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalIncome!: number;

  @Column({ name: 'total_expense', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalExpense!: number;

  @Column({ name: 'total_net', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalNet!: number;

  @Column({ name: 'observations', type: 'varchar', length: 500, nullable: true })
  observations!: string | null;

  @Column({ name: 'closed_by_user_id', type: 'int' })
  closedByUserId!: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'closed_by_user_id' })
  closedByUser!: User;

  @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @OneToMany(() => CashClosureDetail, (d) => d.cashClosure, { cascade: true })
  details!: CashClosureDetail[];

  @OneToMany('FinancialMovement', 'cashClosure')
  financialMovements!: any[];
}
