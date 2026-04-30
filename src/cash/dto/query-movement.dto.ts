import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

const MOVEMENT_TYPES = ['INGRESO', 'EGRESO'] as const;
const MOVEMENT_STATUSES = ['ACTIVO', 'ANULADO'] as const;
const ORIGIN_TYPES = ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL'] as const;

export class QueryMovementDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: MOVEMENT_TYPES })
  @IsOptional()
  @IsIn(MOVEMENT_TYPES)
  movementType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  conceptId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paymentMethodId?: number;

  @ApiPropertyOptional({ enum: MOVEMENT_STATUSES })
  @IsOptional()
  @IsIn(MOVEMENT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: ORIGIN_TYPES })
  @IsOptional()
  @IsIn(ORIGIN_TYPES)
  originType?: string;
}
