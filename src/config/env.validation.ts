import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DB_HOST!: string;

  @IsInt()
  DB_PORT!: number;

  @IsString()
  DB_USER!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_NAME!: string;

  @IsBooleanString()
  @IsOptional()
  DB_ENCRYPT?: string;

  @IsBooleanString()
  @IsOptional()
  DB_TRUST_SERVER_CERT?: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '1h';

  @IsString()
  @MinLength(16)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  @IsString()
  @IsOptional()
  ADMIN_USERNAME?: string;

  @IsString()
  @IsOptional()
  ADMIN_PASSWORD?: string;

  @IsString()
  @IsOptional()
  ADMIN_FULL_NAME?: string;

  @IsString()
  @IsOptional()
  ADMIN_EMAIL?: string;

  @IsBooleanString()
  @IsOptional()
  ADMIN_BOOTSTRAP?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const message = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${message}`);
  }

  return validated;
}
