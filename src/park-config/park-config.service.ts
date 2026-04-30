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

  async get(): Promise<ParkConfig> {
    const config = await this.parkConfigRepo.findOne({ where: {} });
    if (!config) {
      throw new NotFoundException('Park configuration not found');
    }
    return config;
  }

  async update(dto: UpdateParkConfigDto, actorId: number, ip: string): Promise<ParkConfig> {
    const config = await this.get();
    const old = { ...config };

    Object.assign(config, dto);
    config.updatedAt = new Date();

    const saved = await this.parkConfigRepo.save(config);

    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
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
