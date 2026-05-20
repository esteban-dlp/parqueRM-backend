import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateVisitorCompanionDto } from './create-visitor-companion.dto';

export class CreateVisitorDto {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  visitorCategoryId!: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tariffId?: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  appliedRate!: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  totalAmount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  countryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  departmentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  municipalityId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  infoSourceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  travelTypeId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identificationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identificationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ageRange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiPropertyOptional({ default: false, description: 'true = visitante extranjero; false = nacional/local' })
  @IsOptional()
  @IsBoolean()
  isForeign?: boolean = false;

  @ApiPropertyOptional({ default: 'MANUAL' })
  @IsOptional()
  @IsString()
  source?: string = 'MANUAL';

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  reasonIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  activityIds?: number[];

  @ApiPropertyOptional({ type: [CreateVisitorCompanionDto], description: 'Acompañantes del grupo' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateVisitorCompanionDto)
  companions?: CreateVisitorCompanionDto[];
}
