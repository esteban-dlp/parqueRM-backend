import { PartialType } from '@nestjs/swagger';
import { CreateLodgingDto } from './create-lodging.dto';

export class UpdateLodgingDto extends PartialType(CreateLodgingDto) {}
