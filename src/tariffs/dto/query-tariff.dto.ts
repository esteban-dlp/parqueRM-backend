import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryTariffDto extends PaginationDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isForeign?: boolean;
}
