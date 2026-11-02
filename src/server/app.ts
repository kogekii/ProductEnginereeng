import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import pino from 'pino';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { prisma } from './lib/prisma.js';
import { loadConfig, type AppConfig } from './config.js';
import { AuthService } from './modules/auth/auth-service.js';
import { PrismaAuthRepository } from './modules/auth/prisma-auth-repository.js';
import { registerAuthRoutes } from './modules/auth/auth-routes.js';
import { GuardianEventService } from './modules/events/guardian-event-service.js';
import { PrismaGuardianEventsRepository } from './modules/events/prisma-guardian-events-repository.js';
import { registerGuardianEventRoutes } from './modules/events/guardian-event-routes.js';
import { LocalDocumentStorage } from './modules/documents/document-storage.js';
import { SimulatedDocumentProvider } from './modules/documents/simulated-document-provider.js';
import { AuthorizationSubmissionService } from './modules/authorizations/authorization-submission-service.js';
import { PrismaAuthorizationSubmissionRepository } from './modules/authorizations/prisma-submission-repository.js';
import { registerAuthorizationSubmissionRoutes } from './modules/authorizations/submission-routes.js';
import { DocumentService } from './modules/documents/document-service.js';
import { registerDocumentRoutes } from './modules/documents/document-routes.js';
import { AdminTrackingService } from './modules/admin/admin-tracking-service.js';
import { PrismaAdminTrackingRepository } from './modules/admin/prisma-admin-tracking-repository.js';
import { registerAdminTrackingRoutes } from './modules/admin/admin-tracking-routes.js';

export function buildApp(
  config: AppConfig = loadConfig(),
  auth = new AuthService(new PrismaAuthRepository(prisma)),
  logDestination?: pino.DestinationStream,
): FastifyInstance {
  const loggerInstance = pino({ level: config.LOG_LEVEL, redact: ['req.headers.cookie', 'req.headers.authorization'] }, logDestination) as unknown as FastifyBaseLogger;
  const app = Fastify({ loggerInstance });
  app.register(cookie);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ err: error }, 'Error al procesar la solicitud');
    return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Ocurrió un error. Intenta nuevamente.' });
  });
  app.get('/api/health', async () => ({ status: 'ok' }));
  registerAuthRoutes(app, { auth, config });
  registerGuardianEventRoutes(app, new GuardianEventService(new PrismaGuardianEventsRepository(prisma)));
  const storage = new LocalDocumentStorage(config.UPLOAD_DIR);
  const documentProvider = new SimulatedDocumentProvider(prisma, storage, config.RETENTION_DAYS);
  registerDocumentRoutes(app, new DocumentService(prisma, storage, config.RETENTION_DAYS));
  registerAdminTrackingRoutes(app, new AdminTrackingService(new PrismaAdminTrackingRepository(prisma)));
  registerAuthorizationSubmissionRoutes(app, new AuthorizationSubmissionService(
    new PrismaAuthorizationSubmissionRepository(prisma), (submissionId) => documentProvider.createForSubmission(submissionId),
  ));
  if (config.NODE_ENV === 'production') {
    const clientRoot = join(process.cwd(), 'dist', 'client');
    app.register(fastifyStatic, { root: clientRoot, prefix: '/', wildcard: false });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'No encontramos esta dirección.' });
      }
      reply.type('text/html; charset=utf-8');
      return reply.send(await readFile(join(clientRoot, 'index.html')));
    });
  }
  app.addHook('onClose', async () => prisma.$disconnect());
  return app;
}
