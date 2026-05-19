import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  vehicleTypeId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  visitorRecordId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plateNumber?: string;

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

  @ApiPropertyOptional({ default: false, description: 'true = extranjero; false = nacional/local' })
  @IsOptional()
  @IsBoolean()
  isForeign?: boolean = false;

  @ApiPropertyOptional({ default: 'MANUAL' })
  @IsOptional()
  @IsString()
  source?: string;
}
