import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SurveyQuestion } from '../database/entities/survey-question.entity';
import { AuditService } from '../audit/audit.service';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { ReorderSurveyQuestionsDto } from './dto/reorder-survey-questions.dto';

@Injectable()
export class SurveyQuestionsService {
  constructor(
    @InjectRepository(SurveyQuestion)
    private readonly repo: Repository<SurveyQuestion>,
    private readonly audit: AuditService,
  ) {}

  findAll() {
    return this.repo.find({
      where: { deletedAt: IsNull() },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }

  findActive() {
    return this.repo.find({
      where: { deletedAt: IsNull(), isActive: true },
      order: { displayOrder: 'ASC', id: 'ASC' },
    });
  }

  private async findOneOrFail(id: number): Promise<SurveyQuestion> {
    const question = await this.repo.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!question)
      throw new NotFoundException(`SurveyQuestion #${id} not found`);
    return question;
  }

  async create(
    dto: CreateSurveyQuestionDto,
    userId: number,
  ): Promise<SurveyQuestion> {
    const question = this.repo.create({
      text: dto.text,
      answerType: dto.answerType,
      displayOrder: dto.displayOrder ?? 0,
      isActive: true,
    });
    const saved = await this.repo.save(question);
    await this.audit.record({
      userId,
      action: 'CREATE',
      entityName: 'SurveyQuestion',
      entityId: saved.id,
      newValues: { text: saved.text, answerType: saved.answerType },
    });
    return saved;
  }

  async update(
    id: number,
    dto: UpdateSurveyQuestionDto,
    userId: number,
  ): Promise<SurveyQuestion> {
    const question = await this.findOneOrFail(id);
    if (dto.text !== undefined) question.text = dto.text;
    if (dto.answerType !== undefined) question.answerType = dto.answerType;
    if (dto.displayOrder !== undefined)
      question.displayOrder = dto.displayOrder;
    question.updatedAt = new Date();
    const saved = await this.repo.save(question);
    await this.audit.record({
      userId,
      action: 'UPDATE',
      entityName: 'SurveyQuestion',
      entityId: saved.id,
      newValues: {
        text: saved.text,
        answerType: saved.answerType,
        displayOrder: saved.displayOrder,
      },
    });
    return saved;
  }

  async toggleActive(id: number, userId: number): Promise<SurveyQuestion> {
    const question = await this.findOneOrFail(id);
    question.isActive = !question.isActive;
    question.updatedAt = new Date();
    const saved = await this.repo.save(question);
    await this.audit.record({
      userId,
      action: 'TOGGLE_STATUS',
      entityName: 'SurveyQuestion',
      entityId: saved.id,
      newValues: { isActive: saved.isActive },
    });
    return saved;
  }

  async reorder(
    dto: ReorderSurveyQuestionsDto,
    userId: number,
  ): Promise<SurveyQuestion[]> {
    const questions = await Promise.all(
      dto.items.map(async (item) => {
        const question = await this.findOneOrFail(item.id);
        question.displayOrder = item.displayOrder;
        question.updatedAt = new Date();
        return question;
      }),
    );
    const saved = await this.repo.save(questions);
    await this.audit.record({
      userId,
      action: 'REORDER',
      entityName: 'SurveyQuestion',
      entityId: null,
      newValues: { items: dto.items },
    });
    return saved;
  }
}
