import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SurveyAnswer } from './survey-answer.entity';

/**
 * Encuesta anónima: nunca agregar columnas de usuario, visitante,
 * nombre o documento aquí. Solo fecha de envío y comentario general.
 */
@Entity({ name: 'survey_responses' })
export class SurveyResponse {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({
    name: 'submitted_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  submittedAt!: Date;

  @Column({
    name: 'general_comment',
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  generalComment!: string | null;

  @OneToMany(() => SurveyAnswer, (answer) => answer.response, {
    cascade: ['insert'],
  })
  answers!: SurveyAnswer[];
}
