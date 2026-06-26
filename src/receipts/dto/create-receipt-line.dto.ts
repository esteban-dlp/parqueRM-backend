import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const ORIGIN_TYPES = ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL'] as const;

export class CreateReceiptLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  conceptId?: number;

  @ApiPropertyOptional({ enum: ORIGIN_TYPES })
  @IsOptional()
  @IsIn(ORIGIN_TYPES)
  originType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  originId?: number;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(0)
  quantity: number = 1;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  total!: number;
}
