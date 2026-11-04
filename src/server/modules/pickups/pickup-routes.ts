import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { adminPickupDetailResponseSchema, adminPickupListQuerySchema, adminPickupListResponseSchema, pickupContextResponseSchema, pickupListQuerySchema, pickupListResponseSchema, pickupRequestResponseSchema, pickupReviewInputSchema, pickupSubmissionResponseSchema, pickupSubmissionSchema } from '../../../shared/pickup.js';
import { PickupServiceError, type PickupService } from './pickup-service.js';

function sendPickupError(error: unknown, reply: FastifyReply) {
  if (!(error instanceof PickupServiceError)) throw error;
  return reply.status(error.status).send({ code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) });
}

export function registerPickupRoutes(app: FastifyInstance, service: PickupService) {
  app.get('/api/guardian/pickups/context', { preHandler: app.requireGuardian }, async (request, reply) => {
    try { return pickupContextResponseSchema.parse(await service.context(request.authUser!.id)); }
    catch (error) { return sendPickupError(error, reply); }
  });

  app.post('/api/guardian/pickups', { preHandler: app.requireGuardian }, async (request, reply) => {
    const parsed = pickupSubmissionSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ code: 'INVALID_SELECTION', message: 'Revisa las fechas, los estudiantes y los datos de la persona externa.' });
    try {
      const result = await service.submit(parsed.data, {
        guardianId: request.authUser!.id,
        sessionId: request.authSessionId!,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
      const response = pickupSubmissionResponseSchema.parse({ pickupRequestId: result.pickupRequestId, status: result.status });
      return reply.status(result.replayed ? 200 : 201).send(response);
    } catch (error) { return sendPickupError(error, reply); }
  });

  app.get('/api/guardian/pickups', { preHandler: app.requireGuardian }, async (request, reply) => {
    const parsed = pickupListQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ code: 'INVALID_QUERY', message: 'Los filtros de solicitudes no son válidos.' });
    try { return pickupListResponseSchema.parse(await service.listForGuardian(request.authUser!.id, parsed.data)); }
    catch (error) { return sendPickupError(error, reply); }
  });

  app.get<{ Params: { id: string } }>('/api/guardian/pickups/:id', { preHandler: app.requireGuardian }, async (request, reply) => {
    const parsedId = z.uuid().safeParse(request.params.id);
    if (!parsedId.success) return reply.status(404).send({ code: 'PICKUP_NOT_FOUND', message: 'No encontramos la solicitud de retiro.' });
    try {
      const result = await service.getForGuardian(request.authUser!.id, parsedId.data);
      if (!result) return reply.status(404).send({ code: 'PICKUP_NOT_FOUND', message: 'No encontramos la solicitud de retiro.' });
      return pickupRequestResponseSchema.parse(result);
    } catch (error) { return sendPickupError(error, reply); }
  });

  app.get('/api/admin/pickups', { preHandler: app.requireAdmin }, async (request, reply) => {
    const parsed = adminPickupListQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.status(400).send({ code: 'INVALID_QUERY', message: 'Los filtros de solicitudes no son válidos.' });
    try { return adminPickupListResponseSchema.parse(await service.listForAdmin(parsed.data)); }
    catch (error) { return sendPickupError(error, reply); }
  });

  app.get<{ Params: { id: string } }>('/api/admin/pickups/:id', { preHandler: app.requireAdmin }, async (request, reply) => {
    const parsedId = z.uuid().safeParse(request.params.id);
    if (!parsedId.success) return reply.status(404).send({ code: 'PICKUP_NOT_FOUND', message: 'No encontramos la solicitud de retiro.' });
    try {
      const result = await service.getForAdmin(parsedId.data);
      if (!result) return reply.status(404).send({ code: 'PICKUP_NOT_FOUND', message: 'No encontramos la solicitud de retiro.' });
      return adminPickupDetailResponseSchema.parse(result);
    } catch (error) { return sendPickupError(error, reply); }
  });

  app.post<{ Params: { id: string } }>('/api/admin/pickups/:id/review', { preHandler: app.requireAdmin }, async (request, reply) => {
    const parsedId = z.uuid().safeParse(request.params.id);
    if (!parsedId.success) return reply.status(404).send({ code: 'PICKUP_NOT_FOUND', message: 'No encontramos la solicitud de retiro.' });
    const parsed = pickupReviewInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ code: 'INVALID_REVIEW', message: 'Revisa la decisión y, si corresponde, ingresa el motivo del rechazo.' });
    try {
      const result = await service.review(parsedId.data, { adminId: request.authUser!.id, ...parsed.data, ip: request.ip, userAgent: request.headers['user-agent'] });
      return pickupSubmissionResponseSchema.parse(result);
    }
    catch (error) { return sendPickupError(error, reply); }
  });
}
