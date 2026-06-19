import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';

export class ReorderSurveyQuestionItemDto {
  @ApiProperty()
  @IsInt()
  id!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

export class ReorderSurveyQuestionsDto {
  @ApiProperty({ type: [ReorderSurveyQuestionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderSurveyQuestionItemDto)
  items!: ReorderSurveyQuestionItemDto[];
}
