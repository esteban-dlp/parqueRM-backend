import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class CreateSurveyAnswerDto {
  @ApiProperty()
  @IsInt()
  questionId!: number;

  @ApiProperty({
    description:
      'Valor de la respuesta (rango depende del answerType de la pregunta)',
  })
  @IsInt()
  @Min(1)
  @Max(10)
  value!: number;
}
