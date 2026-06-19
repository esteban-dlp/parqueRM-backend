import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SurveyQuestionsService } from './survey-questions.service';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import { ReorderSurveyQuestionsDto } from './dto/reorder-survey-questions.dto';
import { ResponseService } from '../common/services/response.service';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('surveys')
@Controller('surveys/questions')
export class SurveyQuestionsController {
  constructor(
    private readonly service: SurveyQuestionsService,
    private readonly responses: ResponseService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @RequirePermissions('SURVEYS_CONFIG_READ')
  @ApiOperation({
    summary: 'List all survey questions (active and inactive) for admin config',
  })
  async findAll() {
    return this.responses.ok(await this.service.findAll(), 'Survey questions');
  }

  @Get('active')
  @Public()
  @ApiOperation({
    summary:
      'List active survey questions, ordered for the public survey kiosk screen',
  })
  async findActive() {
    return this.responses.ok(
      await this.service.findActive(),
      'Active survey questions',
    );
  }

  @Post()
  @ApiBearerAuth()
  @RequirePermissions('SURVEYS_CONFIG_MANAGE')
  @ApiOperation({ summary: 'Create a survey question' })
  async create(
    @Body() dto: CreateSurveyQuestionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.responses.created(
      await this.service.create(dto, userId),
      'Survey question created',
    );
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @RequirePermissions('SURVEYS_CONFIG_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder survey questions' })
  async reorder(
    @Body() dto: ReorderSurveyQuestionsDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.responses.updated(
      await this.service.reorder(dto, userId),
      'Survey questions reordered',
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @RequirePermissions('SURVEYS_CONFIG_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a survey question' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyQuestionDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.responses.updated(
      await this.service.update(id, dto, userId),
      'Survey question updated',
    );
  }

  @Patch(':id/toggle')
  @ApiBearerAuth()
  @RequirePermissions('SURVEYS_CONFIG_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate or deactivate a survey question' })
  async toggle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.responses.updated(
      await this.service.toggleActive(id, userId),
      'Survey question status toggled',
    );
  }
}
