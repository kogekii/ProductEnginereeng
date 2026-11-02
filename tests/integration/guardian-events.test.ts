import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { loadConfig } from '../../src/server/config.js';

describe.skipIf(!process.env.DATABASE_URL)('API de eventos del apoderado (PostgreSQL)', () => {
  const app = buildApp(loadConfig({ ...process.env, NODE_ENV: 'test', DEMO_MODE: 'true', LOG_LEVEL: 'silent' }));
  afterAll(async () => app.close());

  it('muestra solo eventos aplicables a los estudiantes del apoderado autenticado', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado1@colegio.example' } });
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const response = await app.inject({ method: 'GET', url: '/api/guardian/authorizations/events', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    const events = response.json() as Array<{ title: string; students: Array<{ fullName: string; alreadyAuthorized: boolean }>; allAuthorized: boolean }>;
    expect(events.map(({ title }) => title)).toEqual(['Jornada deportiva']);
    expect(events[0]?.students).toEqual([{ id: '30000000-0000-4000-8000-000000000002', fullName: 'Tomás Ejemplo Demo', alreadyAuthorized: false }]);
    expect(events[0]?.allAuthorized).toBe(false);
  });

  it('rechaza la consulta sin sesión', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/guardian/authorizations/events' });
    expect(response.statusCode).toBe(401);
  });

  it('incluye una excepción INCLUDE para un estudiante vinculado al apoderado', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado2@colegio.example' } });
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const response = await app.inject({ method: 'GET', url: '/api/guardian/authorizations/events', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    const events = response.json() as Array<{ title: string; students: Array<{ id: string }> }>;
    expect(events.map(({ title }) => title)).toContain('Salida pedagógica');
    expect(events.find(({ title }) => title === 'Salida pedagógica')?.students.map(({ id }) => id)).toContain('30000000-0000-4000-8000-000000000004');
  });
});
