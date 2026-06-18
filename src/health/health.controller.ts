import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { existsSync, readFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { join } from 'path';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';

interface LanAddress {
  ip: string;
  interfaceName: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly appVersion = this.resolveVersion();

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return {
      app: 'ParqueRM',
      status: 'ok',
      version: this.appVersion,
      instanceId: process.env.PARQUERM_INSTANCE_ID ?? 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('local-access')
  @Public()
  @ApiOperation({ summary: 'Current LAN access URL for local network users' })
  localAccess() {
    const ips = this.getUsefulLanAddresses();
    const primaryIp = ips[0]?.ip ?? null;
    const loginUrl = primaryIp ? `http://${primaryIp}/login` : null;

    return {
      app: 'ParqueRM',
      status: primaryIp ? 'ok' : 'unavailable',
      version: this.appVersion,
      instanceId: process.env.PARQUERM_INSTANCE_ID ?? 'unknown',
      primaryIp,
      url: primaryIp ? `http://${primaryIp}` : null,
      loginUrl,
      ips,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Database connectivity health check' })
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  private resolveVersion(): string {
    if (process.env.PARQUERM_VERSION) {
      return process.env.PARQUERM_VERSION;
    }

    try {
      const versionPath = join(process.cwd(), 'version.json');
      if (existsSync(versionPath)) {
        const versionInfo = JSON.parse(readFileSync(versionPath, 'utf8')) as {
          version?: unknown;
        };
        if (versionInfo.version) {
          return String(versionInfo.version);
        }
      }
    } catch {
      // Health must stay fast and public even if version metadata is missing.
    }

    return 'unknown';
  }

  private getUsefulLanAddresses(): LanAddress[] {
    const candidates = Object.entries(networkInterfaces()).flatMap(([interfaceName, addrs]) =>
      (addrs ?? [])
        .filter((addr) => addr.family === 'IPv4' && !addr.internal)
        .filter((addr) => !addr.address.startsWith('127.'))
        .map((addr) => ({ ip: addr.address, interfaceName })),
    );

    const nonVirtual = candidates.filter(
      (addr) => !this.isVirtualInterface(addr.interfaceName) && !this.isApipa(addr.ip),
    );

    const usable = nonVirtual.length > 0
      ? nonVirtual
      : candidates.filter((addr) => !this.isApipa(addr.ip));

    const selected = usable.length > 0 ? usable : candidates;

    return selected
      .sort((a, b) => this.addressScore(a) - this.addressScore(b) || a.ip.localeCompare(b.ip))
      .filter(
        (addr, index, list) =>
          list.findIndex((other) => other.ip === addr.ip) === index,
      );
  }

  private addressScore(addr: LanAddress): number {
    let score = 0;
    if (this.isPrivateLanIp(addr.ip)) score -= 20;
    if (/(ethernet|wi-?fi|wireless|wlan|lan)/i.test(addr.interfaceName)) score -= 5;
    if (this.isVirtualInterface(addr.interfaceName)) score += 40;
    if (this.isApipa(addr.ip)) score += 100;
    return score;
  }

  private isPrivateLanIp(ip: string): boolean {
    return (
      /^10\./.test(ip) ||
      /^192\.168\./.test(ip) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
    );
  }

  private isApipa(ip: string): boolean {
    return /^169\.254\./.test(ip);
  }

  private isVirtualInterface(name: string): boolean {
    return /docker|hyper-v|vethernet|virtualbox|vmware|wsl|loopback|vpn|tap|tailscale|wireguard|openvpn|zerotier|anyconnect|nord|radmin/i.test(name);
  }
}
