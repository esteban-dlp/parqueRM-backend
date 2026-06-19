import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { SurveyAnswerType } from '../../database/entities/survey-question.entity';

const ANSWER_TYPES: SurveyAnswerType[] = ['SCALE_1_5', 'SCALE_1_10', 'EMOJI'];

export class CreateSurveyQuestionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  text!: string;

  @ApiProperty({ enum: ANSWER_TYPES })
  @IsEnum(ANSWER_TYPES)
  answerType!: SurveyAnswerType;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  displayOrder?: number;
}
