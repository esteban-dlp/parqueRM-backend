import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities/audit-log.entity';

export interface AuditEntry {
  userId: number | null;
  action: string;
  entityName: string;
  entityId?: string | number | null;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.repo.insert({
      userId: entry.userId,
      action: entry.action,
      entityName: entry.entityName,
      entityId: entry.entityId != null ? String(entry.entityId) : null,
      oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
      newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
      ipAddress: entry.ipAddress ?? null,
    });
  }

  findAll(opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    return this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findByUser(userId: number, opts: { page?: number; limit?: number } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    return this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  findByEntity(entityName: string, entityId?: string) {
    const where: any = { entityName };
    if (entityId) where.entityId = entityId;
    return this.repo.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }
}
