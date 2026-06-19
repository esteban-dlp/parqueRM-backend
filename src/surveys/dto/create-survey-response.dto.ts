import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateSurveyAnswerDto } from './create-survey-answer.dto';

/**
 * Envío de encuesta anónima: no incluye ningún campo de usuario,
 * visitante, nombre o documento — solo respuestas y comentario general.
 */
export class CreateSurveyResponseDto {
  @ApiProperty({ type: [CreateSurveyAnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyAnswerDto)
  answers!: CreateSurveyAnswerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  generalComment?: string;
}
