import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryVehicleDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  vehicleTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  visitorRecordId?: number;

  @ApiPropertyOptional({ description: "'true' = only currently parked (no check-out)" })
  @IsOptional()
  @IsString()
  parked?: string;

  @ApiPropertyOptional({ description: "'true' = exit enabled" })
  @IsOptional()
  @IsString()
  exitEnabled?: string;

  @ApiPropertyOptional({ description: 'Search by plate number' })
  @IsOptional()
  @IsString()
  search?: string;
}
