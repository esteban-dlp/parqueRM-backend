import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCatalogItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Only for countries' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ enum: ['INGRESO', 'EGRESO'], description: 'Only for financial-concepts' })
  @IsOptional()
  @IsEnum(['INGRESO', 'EGRESO'])
  type?: 'INGRESO' | 'EGRESO';

  @ApiPropertyOptional({ description: 'Only for municipalities' })
  @IsOptional()
  @IsInt()
  departmentId?: number;
}
