import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVisitorDto } from './create-visitor.dto';

export class UpdateVisitorDto extends PartialType(
  OmitType(CreateVisitorDto, ['checkInAt', 'recordDate', 'source'] as const),
) {}
