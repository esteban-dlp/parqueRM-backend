import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SurveyQuestion } from '../database/entities/survey-question.entity';
import { SurveyResponse } from '../database/entities/survey-response.entity';
import { SurveyAnswer } from '../database/entities/survey-answer.entity';
import { AuditModule } from '../audit/audit.module';
import { SurveyQuestionsService } from './survey-questions.service';
import { SurveyQuestionsController } from './survey-questions.controller';
import { SurveyResponsesService } from './survey-responses.service';
import { SurveyResponsesController } from './survey-responses.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SurveyQuestion, SurveyResponse, SurveyAnswer]),
    AuditModule,
  ],
  providers: [SurveyQuestionsService, SurveyResponsesService],
  controllers: [SurveyQuestionsController, SurveyResponsesController],
  exports: [SurveyQuestionsService, SurveyResponsesService],
})
export class SurveysModule {}
