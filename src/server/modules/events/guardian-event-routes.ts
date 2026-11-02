import type { FastifyInstance } from 'fastify';
import type { GuardianEventService } from './guardian-event-service.js';

export function registerGuardianEventRoutes(app: FastifyInstance, service: GuardianEventService) {
  app.get('/api/guardian/authorizations/events', { preHandler: app.requireGuardian }, async (request) =>
    service.list(request.authUser!.id),
  );
}
