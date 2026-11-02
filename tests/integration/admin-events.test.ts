import { Writable } from 'node:stream';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { loadConfig } from '../../src/server/config.js';

describe.skipIf(!process.env.DATABASE_URL)('seguimiento de eventos del administrador (PostgreSQL)', () => {
  let logOutput = '';
  const destination = new Writable({ write(chunk, _encoding, callback) { logOutput += chunk.toString(); callback(); } });
  const app = buildApp(loadConfig({ ...process.env, NODE_ENV: 'test', DEMO_MODE: 'true', LOG_LEVEL: 'info' }), undefined, destination);
  afterAll(async () => app.close());

  it('filtra por cursos y mantiene coherentes los contadores y el detalle', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'admin@colegio.example' } });
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const response = await app.inject({ method: 'GET', url: '/api/admin/events', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    const events = response.json() as Array<{ id: string; title: string; status: string; applicableCount: number; pendingCount: number; complete: boolean }>;
    expect(events.map(({ title }) => title)).toEqual(['Salida pedagógica', 'Jornada deportiva', 'Vacunación escolar']);
    expect(events.every(({ applicableCount, pendingCount }) => pendingCount <= applicableCount)).toBe(true);
    const salida = events.find(({ title }) => title === 'Salida pedagógica')!;
    expect(salida.applicableCount).toBe(3);

    const courses = await app.inject({ method: 'GET', url: '/api/admin/courses', headers: { cookie } });
    expect(courses.statusCode).toBe(200);
    const selectedCourse = (courses.json() as Array<{ id: string; name: string }>).find(({ name }) => name === '1° básico A')!;
    const filtered = await app.inject({ method: 'GET', url: `/api/admin/events?courseIds=${selectedCourse.id}`, headers: { cookie } });
    expect((filtered.json() as Array<{ title: string }>).map(({ title }) => title)).toEqual(['Salida pedagógica']);

    const pending = await app.inject({ method: 'GET', url: '/api/admin/events/40000000-0000-4000-8000-000000000001/pending', headers: { cookie } });
    expect(pending.statusCode).toBe(200);
    const pendingData = pending.json() as { event: { status: string }; students: Array<{ courseName: string }> };
    expect(pendingData.event.status).toBe('PUBLISHED');
    expect(pendingData.students).toEqual(expect.arrayContaining([expect.objectContaining({ courseName: '1° básico A' })]));
    expect(pendingData.students).toHaveLength(salida.pendingCount);
    expect(JSON.stringify(pendingData)).not.toContain('DEMO-');

    const guardianLogin = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado1@colegio.example' } });
    const guardianCookie = String(guardianLogin.headers['set-cookie']).split(';')[0];
    expect((await app.inject({ method: 'GET', url: '/api/admin/events', headers: { cookie: guardianCookie } })).statusCode).toBe(403);

    expect(logOutput).not.toContain('Martina');
    expect(logOutput).not.toContain('@colegio.example');
    expect(logOutput).not.toContain('DEMO-');
  });
});
