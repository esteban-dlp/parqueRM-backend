import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { Permission } from '../database/entities/permission.entity';
import { AuditService } from '../audit/audit.service';
import { ResponseCodes } from '../common/constants/response-codes';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly auditService: AuditService,
  ) {}

  findAll() {
    return this.roleRepo.find({
      relations: ['permissions'],
      order: { id: 'ASC' },
    });
  }

  async findById(id: number) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'Role not found' });
    }

    return role;
  }

  async create(dto: CreateRoleDto, actorId: number, ip?: string) {
    const existing = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException({
        code: ResponseCodes.CONFLICT,
        message: `Role name "${dto.name}" already exists`,
      });
    }

    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      isActive: true,
      permissions: [],
    });

    const saved = await this.roleRepo.save(role);

    await this.auditService.record({
      userId: actorId,
      action: 'CREATE_ROLE',
      entityName: 'roles',
      entityId: saved.id,
      newValues: { name: saved.name, description: saved.description },
      ipAddress: ip,
    });

    return saved;
  }

  async update(id: number, dto: UpdateRoleDto, actorId: number, ip?: string) {
    const role = await this.roleRepo.findOne({ where: { id }, relations: ['permissions'] });
    if (!role) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'Role not found' });
    }

    const oldValues = { name: role.name, description: role.description };

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description ?? null;
    role.updatedAt = new Date();

    const saved = await this.roleRepo.save(role);

    await this.auditService.record({
      userId: actorId,
      action: 'UPDATE_ROLE',
      entityName: 'roles',
      entityId: id,
      oldValues,
      newValues: { name: saved.name, description: saved.description },
      ipAddress: ip,
    });

    return saved;
  }

  async delete(id: number, actorId: number, ip?: string) {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'Role not found' });
    }

    role.isActive = false;
    role.updatedAt = new Date();
    await this.roleRepo.save(role);

    await this.auditService.record({
      userId: actorId,
      action: 'DELETE_ROLE',
      entityName: 'roles',
      entityId: id,
      ipAddress: ip,
    });
  }

  async getPermissions(id: number) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'Role not found' });
    }

    return role.permissions;
  }

  async assignPermissions(
    id: number,
    permissionIds: number[],
    actorId: number,
    ip?: string,
  ) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'Role not found' });
    }

    const oldPermIds = role.permissions.map((p) => p.id);

    let permissions: Permission[] = [];
    if (permissionIds.length > 0) {
      permissions = await this.permissionRepo.findBy({ id: In(permissionIds) });
    }

    role.permissions = permissions;
    role.updatedAt = new Date();
    const saved = await this.roleRepo.save(role);

    await this.auditService.record({
      userId: actorId,
      action: 'ASSIGN_PERMISSIONS',
      entityName: 'roles',
      entityId: id,
      oldValues: { permissionIds: oldPermIds },
      newValues: { permissionIds },
      ipAddress: ip,
    });

    return saved.permissions;
  }
}
