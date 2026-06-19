import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SurveyResponsesService } from './survey-responses.service';
import { CreateSurveyResponseDto } from './dto/create-survey-response.dto';
import { ResponseService } from '../common/services/response.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('surveys')
@Controller('surveys/responses')
export class SurveyResponsesController {
  constructor(
    private readonly service: SurveyResponsesService,
    private readonly responses: ResponseService,
  ) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit an anonymous survey response from the public kiosk screen',
  })
  async submit(@Body() dto: CreateSurveyResponseDto) {
    const saved = await this.service.submit(dto);
    return this.responses.created(
      { id: saved.id, submittedAt: saved.submittedAt },
      'Survey response submitted',
    );
  }
}
