import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTariffDto {
  @ApiProperty()
  @IsInt()
  serviceId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  visitorCategoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  vehicleTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  lodgingTypeId?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ enum: ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO'] })
  @IsEnum(['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO'])
  appliesTo!: 'VISITANTE' | 'VEHICULO' | 'HOSPEDAJE' | 'SERVICIO';

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isForeign?: boolean;

  @ApiProperty()
  @IsDateString()
  validFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
