import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'juanperez' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'MyPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  fullName!: string;

  @ApiPropertyOptional({ example: 'juan@parquerm.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Role ID to assign. Defaults to the "Consulta" role if omitted.',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  roleId?: number;
}
