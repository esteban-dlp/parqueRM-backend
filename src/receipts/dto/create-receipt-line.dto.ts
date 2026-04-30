import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class CreateReceiptLineDto {
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
