import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const MOVEMENT_TYPES = ['INGRESO', 'EGRESO'] as const;
const ORIGIN_TYPES = ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL'] as const;

export class CreateMovementDto {
  @ApiProperty({ enum: MOVEMENT_TYPES })
  @IsIn(MOVEMENT_TYPES)
  movementType!: string;

  @ApiProperty()
  @IsInt()
  conceptId!: number;

  @ApiProperty()
  @IsInt()
  paymentMethodId!: number;

  @ApiProperty({ enum: ORIGIN_TYPES })
  @IsIn(ORIGIN_TYPES)
  originType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  originId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  receiptId?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
