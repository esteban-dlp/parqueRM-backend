import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

function toStringArray(value: unknown): string[] {
  if (value == null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNumberArray(value: unknown): number[] {
  return toStringArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export class QueryReportDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  countryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paymentMethodId?: number;

  @ApiPropertyOptional({ description: 'INGRESO or EGRESO' })
  @IsOptional()
  @IsString()
  movementType?: string;

  @ApiPropertyOptional({ description: 'Source filter (e.g. MANUAL, API)' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lodgingTypeId?: number;

  @ApiPropertyOptional({
    description:
      'Origin types to filter income by (VISITANTE, VEHICULO, HOSPEDAJE, SERVICIO_GENERAL, MOVIMIENTO_MANUAL). Omit for all.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: unknown }): string[] => toStringArray(value))
  @IsString({ each: true })
  originTypes?: string[];

  @ApiPropertyOptional({
    description: 'Financial concept ids to filter income reports by. Omit for all.',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }: { value: unknown }): number[] => toNumberArray(value))
  @IsInt({ each: true })
  conceptIds?: number[];
}
