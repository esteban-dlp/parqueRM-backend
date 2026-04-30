import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

const RECEIPT_STATUSES = ['ACTIVO', 'ANULADO', 'PENDIENTE_SICOIN', 'ENVIADO_SICOIN', 'ERROR_SICOIN'] as const;
const ORIGIN_TYPES = ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL'] as const;

export class QueryReceiptDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ enum: RECEIPT_STATUSES })
  @IsOptional()
  @IsIn(RECEIPT_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  paymentMethodId?: number;

  @ApiPropertyOptional({ enum: ORIGIN_TYPES })
  @IsOptional()
  @IsIn(ORIGIN_TYPES)
  originType?: string;
}
