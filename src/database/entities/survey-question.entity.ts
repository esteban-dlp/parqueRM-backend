import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type SurveyAnswerType = 'SCALE_1_5' | 'SCALE_1_10' | 'EMOJI';

@Entity({ name: 'survey_questions' })
export class SurveyQuestion {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'text', type: 'varchar', length: 500 })
  text!: string;

  @Column({ name: 'answer_type', type: 'varchar', length: 20 })
  answerType!: SurveyAnswerType;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt!: Date | null;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt!: Date | null;
}
