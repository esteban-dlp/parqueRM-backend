import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 'jdoe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsInt()
  @IsOptional()
  roleId?: number;
}
