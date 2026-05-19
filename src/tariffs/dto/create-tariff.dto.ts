import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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

  @ApiProperty({ minimum: 0, description: 'Precio para visitantes nacionales/locales' })
  @IsNumber()
  @Min(0)
  amountLocal!: number;

  @ApiProperty({ minimum: 0, description: 'Precio para visitantes extranjeros' })
  @IsNumber()
  @Min(0)
  amountForeign!: number;

  @ApiProperty()
  @IsDateString()
  validFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
