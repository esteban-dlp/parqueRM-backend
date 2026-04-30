import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('database')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Database connectivity health check' })
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
