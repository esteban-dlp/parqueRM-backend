import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../database/entities/permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {}

  findAll() {
    return this.repo.find({ order: { module: 'ASC', code: 'ASC' } });
  }

  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async findGroupedByModule() {
    const all = await this.findAll();
    const grouped: Record<string, Permission[]> = {};
    for (const p of all) {
      grouped[p.module] = grouped[p.module] ?? [];
      grouped[p.module].push(p);
    }
    return grouped;
  }
}
