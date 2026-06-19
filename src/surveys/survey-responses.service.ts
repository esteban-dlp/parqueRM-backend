import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { SurveyResponse } from '../database/entities/survey-response.entity';
import { SurveyAnswer } from '../database/entities/survey-answer.entity';
import {
  SurveyQuestion,
  SurveyAnswerType,
} from '../database/entities/survey-question.entity';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';

const MAX_VALUE_BY_ANSWER_TYPE: Record<SurveyAnswerType, number> = {
  SCALE_1_5: 5,
  SCALE_1_10: 10,
  EMOJI: 5,
};

@Injectable()
export class SurveyResponsesService {
  constructor(
    @InjectRepository(SurveyResponse)
    private readonly responseRepo: Repository<SurveyResponse>,
    @InjectRepository(SurveyAnswer)
    private readonly answerRepo: Repository<SurveyAnswer>,
    @InjectRepository(SurveyQuestion)
    private readonly questionRepo: Repository<SurveyQuestion>,
  ) {}

  async submit(dto: CreateSurveyResponseDto): Promise<SurveyResponse> {
    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await this.questionRepo.find({
      where: { id: In(questionIds), deletedAt: IsNull(), isActive: true },
    });
    const questionById = new Map(questions.map((q) => [q.id, q]));

    for (const answer of dto.answers) {
      const question = questionById.get(answer.questionId);
      if (!question) {
        throw new BadRequestException(
          `Pregunta #${answer.questionId} no existe o está inactiva`,
        );
      }
      const max = MAX_VALUE_BY_ANSWER_TYPE[question.answerType];
      if (answer.value < 1 || answer.value > max) {
        throw new BadRequestException(
          `Valor ${answer.value} fuera de rango para la pregunta #${answer.questionId} (1-${max})`,
        );
      }
    }

    const response = this.responseRepo.create({
      generalComment: dto.generalComment ?? null,
    });
    const saved = await this.responseRepo.save(response);

    const answers = dto.answers.map((a) =>
      this.answerRepo.create({
        surveyResponseId: saved.id,
        surveyQuestionId: a.questionId,
        value: a.value,
      }),
    );
    await this.answerRepo.save(answers);

    return saved;
  }
}
