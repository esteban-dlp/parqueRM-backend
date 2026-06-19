import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SurveyResponse } from './survey-response.entity';
import { SurveyQuestion } from './survey-question.entity';

@Entity({ name: 'survey_answers' })
export class SurveyAnswer {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id!: number;

  @Column({ name: 'survey_response_id', type: 'int' })
  surveyResponseId!: number;

  @ManyToOne(() => SurveyResponse, (response) => response.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'survey_response_id', referencedColumnName: 'id' })
  response!: SurveyResponse;

  @Column({ name: 'survey_question_id', type: 'int' })
  surveyQuestionId!: number;

  @ManyToOne(() => SurveyQuestion, { eager: false })
  @JoinColumn({ name: 'survey_question_id', referencedColumnName: 'id' })
  question!: SurveyQuestion;

  @Column({ name: 'value', type: 'int' })
  value!: number;
}
