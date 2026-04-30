import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLodgingDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  lodgingTypeId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  nights!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guests!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tariffId?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  appliedRate!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;
}
