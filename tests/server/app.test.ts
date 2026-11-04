import { describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { loadConfig } from '../../src/server/config.js';
import { AuthService, type AuthRepository, type AuthUser } from '../../src/server/modules/auth/auth-service.js';

const demoUser: AuthUser = { id: 'admin-id', email: 'admin@example.test', phoneE164: '+56912345678', firstName: 'Admin', paternalSurname: 'Prueba', maternalSurname: null, isAdmin: true };

class FakeAuthRepository implements AuthRepository {
  tokenHash = '';
  user: AuthUser | null = demoUser;
  findActiveUser(identifier: string) { return Promise.resolve(identifier === demoUser.email || identifier === demoUser.phoneE164 ? this.user : null); }
  createSession(input: { tokenHash: string }) { this.tokenHash = input.tokenHash; return Promise.resolve(); }
  findActiveSession(tokenHash: string) { return Promise.resolve(tokenHash === this.tokenHash && this.user ? { id: 'session-id', user: this.user } : null); }
  revokeSession() { this.tokenHash = ''; return Promise.resolve(); }
}

describe('configuración del servidor', () => {
  it('permite el modo demo en producción sin cambiar el entorno', () => {
    const config = loadConfig({ NODE_ENV: 'production', DEMO_MODE: 'true' });
    expect(config.NODE_ENV).toBe('production');
    expect(config.DEMO_MODE).toBe(true);
  });

  it('falla con configuración inválida', () => {
    expect(() => loadConfig({ LOG_LEVEL: 'verbose' })).toThrow('Configuración inválida');
  });
});

describe('aplicación Fastify', () => {
  it('responde salud operacional', async () => {
    const app = buildApp(loadConfig({ NODE_ENV: 'test', DEMO_MODE: 'false', LOG_LEVEL: 'silent' }));
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('autentica por correo, persiste el hash y protege por rol', async () => {
    const repository = new FakeAuthRepository();
    const app = buildApp(loadConfig({ NODE_ENV: 'test', DEMO_MODE: 'true', LOG_LEVEL: 'silent' }), new AuthService(repository));
    app.get('/api/test/admin', { preHandler: app.requireAdmin }, async (request) => ({ id: request.authUser?.id }));
    app.get('/api/test/guardian', { preHandler: app.requireGuardian }, async () => ({ ok: true }));

    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'ADMIN@EXAMPLE.TEST' } });
    expect(login.statusCode).toBe(200);
    expect(login.headers['set-cookie']).toContain('HttpOnly');
    expect(repository.tokenHash).not.toContain('=');

    const cookieHeader = String(login.headers['set-cookie']).split(';')[0];
    expect((await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieHeader } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/test/admin' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/test/admin', headers: { cookie: cookieHeader } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/test/guardian', headers: { cookie: cookieHeader } })).statusCode).toBe(403);
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: cookieHeader } });
    expect((await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie: cookieHeader } })).statusCode).toBe(401);
    await app.close();
  });

  it('no crea sesión para una cuenta inexistente', async () => {
    const repository = new FakeAuthRepository();
    const app = buildApp(loadConfig({ NODE_ENV: 'test', DEMO_MODE: 'true', LOG_LEVEL: 'silent' }), new AuthService(repository));
    const response = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'no-existe@example.test' } });
    expect(response.statusCode).toBe(404);
    expect(repository.tokenHash).toBe('');
    await app.close();
  });
});
