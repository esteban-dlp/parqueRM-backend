import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { DataResetPrepareDto } from './dto/data-reset-prepare.dto';
import { DataResetExecuteDto } from './dto/data-reset-execute.dto';
import { ResponseService } from '../common/services/response.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '../common/interfaces/api-response.interface';
import { BadRequestException } from '@nestjs/common';

@ApiTags('system')
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly responses: ResponseService,
  ) {}

  @Post('data-reset/prepare')
  @RequirePermissions('PLATFORM_DATA_RESET')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Genera un nonce temporal para autorizar el reset de datos operativos',
    description:
      'Requiere que confirmationWord sea exactamente "ELIMINAR". Retorna un nonce de un solo uso válido por 5 minutos.',
  })
  async prepareReset(
    @Body() dto: DataResetPrepareDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    if (dto.confirmationWord !== 'ELIMINAR') {
      throw new BadRequestException({
        message: 'La palabra de confirmación no coincide. Debes escribir exactamente: ELIMINAR',
      });
    }

    const ip: string = req.ip ?? req.headers?.['x-forwarded-for'] ?? 'unknown';
    const result = await this.systemService.prepareReset(user.id, ip);
    return this.responses.ok(result, 'Nonce generado. Tienes 5 minutos para confirmar la operación.');
  }

  @Post('data-reset/execute')
  @RequirePermissions('PLATFORM_DATA_RESET')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecuta el reset de datos operativos de la plataforma',
    description:
      'Requiere nonce válido (obtenido de /prepare) y contraseña del administrador. La operación es irreversible y transaccional.',
  })
  async executeReset(
    @Body() dto: DataResetExecuteDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: any,
  ) {
    const ip: string = req.ip ?? req.headers?.['x-forwarded-for'] ?? 'unknown';
    await this.systemService.executeReset(user.id, dto.nonce, dto.adminPassword, ip);
    return this.responses.ok(null, 'Datos operativos eliminados correctamente.');
  }
}
