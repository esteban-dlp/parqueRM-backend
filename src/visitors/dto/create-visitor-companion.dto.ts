import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVisitorCompanionDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  visitorCategoryId!: number;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity!: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  appliedRate!: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  totalAmount!: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isForeign?: boolean;
}
