import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryTariffDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO'] })
  @IsOptional()
  @IsEnum(['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO'])
  appliesTo?: 'VISITANTE' | 'VEHICULO' | 'HOSPEDAJE' | 'SERVICIO';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  serviceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

}
