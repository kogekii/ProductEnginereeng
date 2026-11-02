import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AdminTrackingService } from './admin-tracking-service.js';

export function registerAdminTrackingRoutes(app: FastifyInstance, service: AdminTrackingService) {
  app.get('/api/admin/courses', { preHandler: app.requireAdmin }, async () => service.courses());
  app.get<{ Querystring: { courseIds?: string | string[] } }>('/api/admin/events', { preHandler: app.requireAdmin }, async (request, reply) => {
    const raw = request.query.courseIds;
    const parsed = z.array(z.uuid()).safeParse(raw === undefined ? [] : Array.isArray(raw) ? raw : [raw]);
    if (!parsed.success) return reply.status(400).send({ code: 'INVALID_COURSE_FILTER', message: 'El filtro de cursos no es válido.' });
    return service.events(parsed.data);
  });
  app.get<{ Params: { id: string } }>('/api/admin/events/:id/pending', { preHandler: app.requireAdmin }, async (request, reply) => {
    const parsed = z.uuid().safeParse(request.params.id);
    if (!parsed.success) return reply.status(404).send({ code: 'EVENT_NOT_FOUND', message: 'No encontramos el evento solicitado.' });
    const students = await service.pending(parsed.data);
    if (!students) return reply.status(404).send({ code: 'EVENT_NOT_FOUND', message: 'No encontramos el evento solicitado.' });
    return students;
  });
}
