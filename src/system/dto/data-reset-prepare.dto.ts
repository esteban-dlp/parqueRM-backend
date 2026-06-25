import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DataResetPrepareDto {
  @ApiProperty({
    description: 'Palabra de confirmación. Debe ser exactamente "ELIMINAR".',
    example: 'ELIMINAR',
  })
  @IsString()
  confirmationWord!: string;
}
