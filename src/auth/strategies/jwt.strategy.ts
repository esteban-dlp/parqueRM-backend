import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { AuthenticatedUser } from '../../common/interfaces/api-response.interface';

export interface JwtPayload {
  sub: number;
  username: string;
  roleId: number;
  roleName: string;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['role', 'role.permissions'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!user.role || !user.role.isActive) {
      throw new UnauthorizedException('Role is inactive');
    }

    const permissions = (user.role.permissions ?? []).map((p) => p.code);

    return {
      id: user.id,
      username: user.username,
      roleId: user.role.id,
      roleName: user.role.name,
      permissions,
    };
  }
}
