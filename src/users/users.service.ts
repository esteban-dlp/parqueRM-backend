import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { ResponseCodes } from '../common/constants/response-codes';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

const MAX_LIMIT = 100;

function stripPassword<T extends Partial<User>>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _pw, ...rest } = user as any;
  return rest;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? 20));

    const qb = this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.role', 'role')
      .orderBy('u.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.isActive !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive: query.isActive });
    }

    if (query.roleId !== undefined) {
      qb.andWhere('u.role_id = :roleId', { roleId: query.roleId });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((u) => stripPassword(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new NotFoundException({
        code: ResponseCodes.NOT_FOUND,
        message: 'User not found',
      });
    }

    return stripPassword(user);
  }

  async create(dto: CreateUserDto, actorId: number, ip?: string) {
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException({
        code: ResponseCodes.CONFLICT,
        message: `Username "${dto.username}" is already taken`,
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      fullName: dto.fullName,
      email: dto.email ?? null,
      roleId: dto.roleId,
      isActive: true,
    });

    const saved = await this.userRepo.save(user);

    await this.auditService.record({
      userId: actorId,
      action: 'CREATE_USER',
      entityName: 'users',
      entityId: saved.id,
      newValues: { username: saved.username, fullName: saved.fullName, roleId: saved.roleId },
      ipAddress: ip,
    });

    return stripPassword(saved);
  }

  async update(id: number, dto: UpdateUserDto, actorId: number, ip?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'User not found' });
    }

    const oldValues = { fullName: user.fullName, email: user.email, roleId: user.roleId };

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.email !== undefined) user.email = dto.email ?? null;
    if (dto.roleId !== undefined) user.roleId = dto.roleId;
    user.updatedAt = new Date();

    const saved = await this.userRepo.save(user);

    await this.auditService.record({
      userId: actorId,
      action: 'UPDATE_USER',
      entityName: 'users',
      entityId: id,
      oldValues,
      newValues: { fullName: saved.fullName, email: saved.email, roleId: saved.roleId },
      ipAddress: ip,
    });

    return stripPassword(saved);
  }

  async updateStatus(id: number, isActive: boolean, actorId: number, ip?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'User not found' });
    }

    const oldActive = user.isActive;
    user.isActive = isActive;
    user.updatedAt = new Date();

    const saved = await this.userRepo.save(user);

    await this.auditService.record({
      userId: actorId,
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entityName: 'users',
      entityId: id,
      oldValues: { isActive: oldActive },
      newValues: { isActive: saved.isActive },
      ipAddress: ip,
    });

    return stripPassword(saved);
  }

  async changePassword(id: number, newPassword: string, actorId: number, ip?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = passwordHash;
    user.updatedAt = new Date();
    await this.userRepo.save(user);

    await this.auditService.record({
      userId: actorId,
      action: 'ADMIN_CHANGE_PASSWORD',
      entityName: 'users',
      entityId: id,
      ipAddress: ip,
    });
  }

  async delete(id: number, actorId: number, ip?: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({ code: ResponseCodes.NOT_FOUND, message: 'User not found' });
    }

    user.isActive = false;
    user.updatedAt = new Date();
    await this.userRepo.save(user);

    await this.auditService.record({
      userId: actorId,
      action: 'DELETE_USER',
      entityName: 'users',
      entityId: id,
      ipAddress: ip,
    });
  }
}
