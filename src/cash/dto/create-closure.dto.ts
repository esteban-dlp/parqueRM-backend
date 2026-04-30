import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateClosureDto {
  @ApiPropertyOptional({ description: 'Optional observations for this closure' })
  @IsOptional()
  @IsString()
  observations?: string;
}
