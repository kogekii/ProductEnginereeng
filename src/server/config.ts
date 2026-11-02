import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().default('postgresql://colegio:colegio@localhost:5432/colegio'),
  SESSION_SECRET: z.string().default('desarrollo-cambiar-en-produccion'),
  DEMO_MODE: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  UPLOAD_DIR: z.string().default('./data/uploads'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RETENTION_DAYS: z.coerce.number().int().positive().default(365),
});

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const result = envSchema.safeParse(source);
  if (!result.success) throw new Error(`Configuración inválida: ${z.prettifyError(result.error)}`);
  if (result.data.DEMO_MODE && result.data.NODE_ENV === 'production') {
    throw new Error('El modo demostración no se puede activar en producción.');
  }
  return result.data;
}

export type AppConfig = ReturnType<typeof loadConfig>;
