import type { FastifyInstance } from 'fastify';
import { authorizationSubmissionSchema } from '../../../shared/authorization.js';
import type { AuthorizationSubmissionService } from './authorization-submission-service.js';

export function registerAuthorizationSubmissionRoutes(app: FastifyInstance, service: AuthorizationSubmissionService) {
  app.post('/api/guardian/authorizations/submissions', { preHandler: app.requireGuardian }, async (request, reply) => {
    const parsed = authorizationSubmissionSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ code: 'INVALID_SELECTION', message: 'Revisa la selección de autorizaciones e inténtalo nuevamente.' });
    let result;
    try {
      result = await service.submit(parsed.data, {
        guardianId: request.authUser!.id,
        sessionId: request.authSessionId!,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('El documento')) return reply.status(400).send({ code: 'INVALID_DOCUMENT', message: error.message });
      throw error;
    }
    app.log.info({ submissionId: result.submissionId, createdCount: result.createdCount, failedCount: result.failedCount }, 'Envío de autorizaciones procesado');
    return reply.status(200).send(result);
  });
}
