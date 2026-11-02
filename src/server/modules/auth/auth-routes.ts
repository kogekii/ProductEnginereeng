import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AppConfig } from '../../config.js';
import type { AuthService, AuthUser } from './auth-service.js';

declare module 'fastify' {
  interface FastifyRequest { authUser: AuthUser | null; authSessionId: string | null }
}

const identifierSchema = z.object({ identifier: z.string().trim().min(1).max(254) });

export function registerAuthRoutes(app: FastifyInstance, options: { auth: AuthService; config: AppConfig }) {
  app.decorateRequest('authUser', null);
  app.decorateRequest('authSessionId', null);

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies.session;
    if (!token) return reply.status(401).send({ code: 'AUTH_REQUIRED', message: 'Inicia sesión para continuar.' });
    const session = await options.auth.getSession(token);
    if (!session) return reply.status(401).send({ code: 'AUTH_REQUIRED', message: 'Inicia sesión para continuar.' });
    request.authUser = session.user;
    request.authSessionId = session.id;
  });
  app.decorate('requireAdmin', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply);
    if (reply.sent) return;
    if (!request.authUser?.isAdmin) return reply.status(403).send({ code: 'FORBIDDEN', message: 'No tienes permiso para acceder a esta sección.' });
  });
  app.decorate('requireGuardian', async (request: FastifyRequest, reply: FastifyReply) => {
    await app.authenticate(request, reply);
    if (reply.sent) return;
    if (request.authUser?.isAdmin) return reply.status(403).send({ code: 'FORBIDDEN', message: 'Esta acción es solo para apoderados.' });
  });

  app.get('/api/auth/config', async () => ({ demoMode: options.config.DEMO_MODE }));
  if (options.config.DEMO_MODE) {
    app.post('/api/auth/demo-login', async (request, reply) => {
      const parsed = identifierSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ code: 'INVALID_IDENTIFIER', message: 'Ingresa un correo o teléfono válido.' });
      const session = await options.auth.login(parsed.data.identifier, { ip: request.ip, userAgent: request.headers['user-agent'] });
      if (!session) return reply.status(404).send({ code: 'ACCOUNT_NOT_FOUND', message: 'No encontramos una cuenta activa con esos datos.' });
      reply.setCookie('session', session.token, { httpOnly: true, sameSite: 'lax', secure: options.config.NODE_ENV === 'production', path: '/', expires: session.expiresAt });
      return { user: session.user, demoMode: true };
    });
  }

  app.get('/api/auth/me', { preHandler: app.authenticate }, async (request) => ({ user: request.authUser, demoMode: options.config.DEMO_MODE }));
  app.post('/api/auth/logout', async (request, reply) => {
    await options.auth.logout(request.cookies.session);
    reply.clearCookie('session', { path: '/' });
    return reply.status(204).send();
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireGuardian: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
