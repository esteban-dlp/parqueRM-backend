import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateReceiptLineDto } from './create-receipt-line.dto';

const ORIGIN_TYPES = ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO_GENERAL', 'MOVIMIENTO_MANUAL'] as const;

export class CreateReceiptDto {
  @ApiPropertyOptional({ description: 'If not provided, will be auto-generated' })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contributorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contributorDocument?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contributorAddress?: string;

  @ApiProperty({ enum: ORIGIN_TYPES })
  @IsIn(ORIGIN_TYPES)
  originType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  originId?: number;

  @ApiProperty()
  @IsInt()
  paymentMethodId!: number;

  @ApiProperty()
  @IsNumber()
  total!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amountReceived?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiProperty({ type: [CreateReceiptLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReceiptLineDto)
  lines!: CreateReceiptLineDto[];
}
