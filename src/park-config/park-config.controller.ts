import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParkConfigService } from './park-config.service';
import { UpdateParkConfigDto } from './dto/update-park-config.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ALLOWED_LOGO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

@ApiTags('park-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('park-config')
export class ParkConfigController {
  constructor(
    private readonly parkConfigService: ParkConfigService,
    private readonly responses: ResponseService,
  ) {}

  /**
   * Devuelve la configuración del parque.
   * Si todavía no existe ningún registro, devuelve data: null (no es un error).
   * El frontend puede distinguir "no configurado" de "error real".
   */
  @Get()
  @RequirePermissions('CONFIG_READ')
  @ApiOperation({ summary: 'Get park configuration (null if not yet created)' })
  async get() {
    const config = await this.parkConfigService.get();
    return this.responses.ok(config, config ? 'Park configuration' : 'No configuration found');
  }

  /**
   * Crea o actualiza la configuración del parque (upsert).
   * Si no existe registro, lo crea. Si ya existe, lo actualiza.
   */
  @Patch()
  @RequirePermissions('CONFIG_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or update park configuration (upsert)' })
  async upsert(
    @Body() dto: UpdateParkConfigDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const config = await this.parkConfigService.upsert(dto, actorId, req.ip);
    return this.responses.updated(config, 'Park configuration saved');
  }

  @Post('logo')
  @RequirePermissions('CONFIG_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload park logo (offline, stored on server filesystem)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadsPath = process.env.UPLOADS_PATH ?? join(process.cwd(), 'uploads');
          cb(null, join(uploadsPath, 'logos'));
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `logo-${uniqueSuffix}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_LOGO_SIZE },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (!ALLOWED_LOGO_EXTENSIONS.includes(ext)) {
          return cb(new BadRequestException(`Solo se permiten: ${ALLOWED_LOGO_EXTENSIONS.join(', ')}`), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const logoUrl = `/uploads/logos/${file.filename}`;
    // upsert: creates config if it doesn't exist yet, or updates logoUrl if it does
    const config = await this.parkConfigService.upsert({ logoUrl }, actorId, req.ip);
    return this.responses.ok({ logoUrl: config.logoUrl }, 'Logo subido correctamente');
  }

  @Get('services')
  @RequirePermissions('CONFIG_READ')
  @ApiOperation({ summary: 'Get all services' })
  async getServices() {
    const services = await this.parkConfigService.getServices();
    return this.responses.ok(services, 'Services');
  }

  @Patch('services/:id/toggle')
  @RequirePermissions('CONFIG_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle service enabled/disabled' })
  async toggleService(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const service = await this.parkConfigService.toggleService(id, actorId, req.ip);
    return this.responses.updated(service, 'Service status toggled');
  }
}
