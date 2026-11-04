import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DocumentService } from './document-service.js';

const uploadQuerySchema = z.object({
  type: z.enum(['GUARDIAN_IDENTITY', 'EXTERNAL_IDENTITY']).default('GUARDIAN_IDENTITY'),
  guardianDocumentId: z.uuid().optional(),
});

export function registerDocumentRoutes(app: FastifyInstance, service: DocumentService) {
  app.register(multipart, { limits: { files: 1, fileSize: 10 * 1024 * 1024 } });
  app.post('/api/documents', { preHandler: app.requireGuardian }, async (request, reply) => {
    const query = uploadQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ code: 'INVALID_DOCUMENT', message: 'Los datos para subir el documento no son válidos.' });
    if (query.data.type === 'EXTERNAL_IDENTITY' && !query.data.guardianDocumentId) {
      return reply.status(400).send({ code: 'GUARDIAN_DOCUMENT_REQUIRED', message: 'Sube primero el documento del apoderado.' });
    }
    if (query.data.type === 'GUARDIAN_IDENTITY' && query.data.guardianDocumentId) {
      return reply.status(400).send({ code: 'INVALID_DOCUMENT', message: 'El documento del apoderado no requiere otro documento previo.' });
    }
    let part;
    try { part = await request.file({ limits: { files: 1, fileSize: 10 * 1024 * 1024 } }); }
    catch (error) {
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) return reply.status(413).send({ code: 'FILE_TOO_LARGE', message: 'El archivo supera el tamaño máximo de 10 MB.' });
      throw error;
    }
    if (!part) return reply.status(400).send({ code: 'DOCUMENT_REQUIRED', message: 'Selecciona un documento de identidad.' });
    const mime = z.enum(['image/jpeg', 'image/png', 'application/pdf']).safeParse(part.mimetype);
    if (!mime.success) return reply.status(400).send({ code: 'INVALID_DOCUMENT_TYPE', message: 'El archivo debe ser JPG, PNG o PDF.' });
    let buffer: Buffer;
    try { buffer = await part.toBuffer(); }
    catch (error) {
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) return reply.status(413).send({ code: 'FILE_TOO_LARGE', message: 'El archivo supera el tamaño máximo de 10 MB.' });
      throw error;
    }
    try {
      const document = await service.upload(request.authUser!.id, buffer, mime.data, query.data.type, query.data.guardianDocumentId);
      app.log.info({ documentId: document.id }, 'Documento de identidad recibido');
      return reply.status(201).send({ documentId: document.id });
    } catch (error) {
      if (error instanceof Error && error.message.includes('no coincide')) return reply.status(400).send({ code: 'INVALID_DOCUMENT_CONTENT', message: 'El contenido del archivo no corresponde a un documento válido.' });
      if (error instanceof Error && error.message.includes('documento')) return reply.status(400).send({ code: 'INVALID_DOCUMENT', message: error.message });
      throw error;
    }
  });

  app.get<{ Params: { id: string } }>('/api/documents/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = z.uuid().safeParse(request.params.id);
    if (!parsed.success) return reply.status(404).send({ code: 'DOCUMENT_NOT_FOUND', message: 'No encontramos el documento solicitado.' });
    const document = await service.read(parsed.data, { id: request.authUser!.id, isAdmin: request.authUser!.isAdmin });
    if (!document) return reply.status(403).send({ code: 'FORBIDDEN', message: 'No tienes permiso para ver este documento.' });
    app.log.info({ documentId: parsed.data }, 'Documento de identidad consultado');
    return reply.type(document.mimeType).header('Content-Disposition', 'attachment').header('Cache-Control', 'no-store').send(document.buffer);
  });
}
