import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DataResetExecuteDto {
  @ApiProperty({ description: 'Nonce temporal obtenido desde /prepare.' })
  @IsString()
  nonce!: string;

  @ApiProperty({ description: 'Contraseña actual del administrador.' })
  @IsString()
  adminPassword!: string;
}
