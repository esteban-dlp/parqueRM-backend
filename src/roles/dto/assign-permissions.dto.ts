import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class AssignPermissionsDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  permissionIds!: number[];
}
