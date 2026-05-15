import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkConfig } from '../database/entities/park-config.entity';
import { Service } from '../database/entities/service.entity';
import { AuditService } from '../audit/audit.service';
import { UpdateParkConfigDto } from './dto/update-park-config.dto';

@Injectable()
export class ParkConfigService {
  private readonly logger = new Logger(ParkConfigService.name);

  constructor(
    @InjectRepository(ParkConfig)
    private readonly parkConfigRepo: Repository<ParkConfig>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    private readonly audit: AuditService,
  ) {}

  /** Devuelve la configuración del parque, o null si todavía no existe. */
  async get(): Promise<ParkConfig | null> {
    return this.parkConfigRepo.findOne({ where: {}, order: { id: 'ASC' } }) ?? null;
  }

  /**
   * Crea la configuración si no existe, o la actualiza si ya existe.
   * Esto permite que el frontend funcione desde una DB vacía.
   */
  async upsert(dto: UpdateParkConfigDto, actorId: number, ip: string): Promise<ParkConfig> {
    const existing = await this.parkConfigRepo.findOne({ where: {}, order: { id: 'ASC' } });
    const isNew = !existing;

    // Garantizamos que config es ParkConfig (nunca null) antes de Object.assign
    const config: ParkConfig = existing ?? this.parkConfigRepo.create({
      parkName: dto.parkName ?? 'Mi parque',
      sidebarColorHex: dto.sidebarColorHex ?? '#1A3A2A',
    });

    const old = isNew ? null : { ...config };
    Object.assign(config, dto);
    if (!isNew) config.updatedAt = new Date();

    const saved = await this.parkConfigRepo.save(config);

    await this.audit.record({
      userId: actorId,
      action: isNew ? 'CREATE' : 'UPDATE',
      entityName: 'ParkConfig',
      entityId: saved.id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return saved;
  }

  async getServices(): Promise<Service[]> {
    return this.serviceRepo.find({ order: { code: 'ASC' } });
  }

  async toggleService(serviceId: number, actorId: number, ip: string): Promise<Service> {
    const service = await this.serviceRepo.findOne({ where: { id: serviceId } });
    if (!service) {
      throw new NotFoundException(`Service #${serviceId} not found`);
    }

    const old = { ...service };
    service.isEnabled = !service.isEnabled;
    const saved = await this.serviceRepo.save(service);

    await this.audit.record({
      userId: actorId,
      action: 'TOGGLE',
      entityName: 'Service',
      entityId: saved.id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return saved;
  }
}
