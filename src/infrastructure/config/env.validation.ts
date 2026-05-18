import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  PORT: number = 3000;

  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsString()
  FIREBASE_PROJECT_ID: string;

  @IsString()
  FIREBASE_SERVICE_ACCOUNT: string;

  @IsString()
  TELEGRAM_BOT_TOKEN: string;

  // Storage
  @IsString()
  STORAGE_DRIVER: string = 'local';

  @IsString()
  @IsOptional()
  STORAGE_LOCAL_PATH: string = './uploads';

  @IsString()
  @IsOptional()
  STORAGE_PUBLIC_URL: string;

  @IsString()
  @IsOptional()
  STORAGE_ENDPOINT: string;

  @IsString()
  @IsOptional()
  STORAGE_REGION: string;

  @IsString()
  @IsOptional()
  STORAGE_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  STORAGE_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  STORAGE_BUCKET: string;

  @IsString()
  @IsOptional()
  STORAGE_CDN_URL: string;

  // WebRTC TURN server (optional — falls back to Google STUN only)
  @IsString()
  @IsOptional()
  STUN_HOST: string;

  @IsString()
  @IsOptional()
  TURN_HOST: string;

  @IsString()
  @IsOptional()
  TURN_SECRET: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
