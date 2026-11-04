import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { Writable } from 'node:stream';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { loadConfig } from '../../src/server/config.js';
import { prisma } from '../../src/server/lib/prisma.js';

describe.skipIf(!process.env.DATABASE_URL)('documentos de identidad (PostgreSQL)', () => {
  let logOutput = '';
  const logDestination = new Writable({ write(chunk, _encoding, callback) { logOutput += chunk.toString(); callback(); } });
  const app = buildApp(loadConfig({ ...process.env, NODE_ENV: 'test', DEMO_MODE: 'true', LOG_LEVEL: 'info' }), undefined, logDestination);
  let uploadedDocumentId: string | undefined;
  let uploadedExternalDocumentId: string | undefined;
  afterAll(async () => {
    if (uploadedExternalDocumentId) {
      const row = await prisma.document.findUnique({ where: { id: uploadedExternalDocumentId }, select: { privatePath: true } });
      if (row) await rm(row.privatePath, { force: true });
      await prisma.document.deleteMany({ where: { id: uploadedExternalDocumentId } });
    }
    if (uploadedDocumentId) {
      const row = await prisma.document.findUnique({ where: { id: uploadedDocumentId }, select: { privatePath: true } });
      if (row) await rm(row.privatePath, { force: true });
      await prisma.document.deleteMany({ where: { id: uploadedDocumentId } });
    }
    await app.close();
  });

  it('permite leer el documento al dueño y administrador, con descarga privada', async () => {
    const guardianLogin = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado1@colegio.example' } });
    const guardianCookie = String(guardianLogin.headers['set-cookie']).split(';')[0];
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=', 'base64');
    const uploadFile = async (url: string) => {
      const boundary = `school-${randomUUID()}`;
      const preamble = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="identidad.png"\r\nContent-Type: image/png\r\n\r\n`);
      const ending = Buffer.from(`\r\n--${boundary}--\r\n`);
      return app.inject({
        method: 'POST', url, headers: { cookie: guardianCookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
        payload: Buffer.concat([preamble, png, ending]),
      });
    };
    const missingPredecessor = await app.inject({ method: 'POST', url: '/api/documents?type=EXTERNAL_IDENTITY', headers: { cookie: guardianCookie } });
    expect(missingPredecessor.statusCode).toBe(400);
    const upload = await uploadFile('/api/documents');
    expect(upload.statusCode).toBe(201);
    uploadedDocumentId = (upload.json() as { documentId: string }).documentId;

    const externalUpload = await uploadFile(`/api/documents?type=EXTERNAL_IDENTITY&guardianDocumentId=${uploadedDocumentId}`);
    expect(externalUpload.statusCode).toBe(201);
    uploadedExternalDocumentId = (externalUpload.json() as { documentId: string }).documentId;
    const externalDocument = await prisma.document.findUnique({ where: { id: uploadedExternalDocumentId }, select: { type: true, predecessorDocumentId: true } });
    expect(externalDocument).toEqual({ type: 'EXTERNAL_IDENTITY', predecessorDocumentId: uploadedDocumentId });

    const ownerRead = await app.inject({ method: 'GET', url: `/api/documents/${uploadedDocumentId}`, headers: { cookie: guardianCookie } });
    expect(ownerRead.statusCode).toBe(200);
    expect(ownerRead.headers['content-disposition']).toBe('attachment');
    expect(ownerRead.headers['cache-control']).toBe('no-store');
    const externalOwnerRead = await app.inject({ method: 'GET', url: `/api/documents/${uploadedExternalDocumentId}`, headers: { cookie: guardianCookie } });
    expect(externalOwnerRead.statusCode).toBe(200);
    await prisma.document.update({ where: { id: uploadedDocumentId }, data: { deleteAfter: new Date(Date.now() - 60_000) } });
    expect((await app.inject({ method: 'GET', url: `/api/documents/${uploadedDocumentId}`, headers: { cookie: guardianCookie } })).statusCode).toBe(403);
    await prisma.document.update({ where: { id: uploadedDocumentId }, data: { deleteAfter: new Date(Date.now() + 365 * 86_400_000) } });

    const otherLogin = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado2@colegio.example' } });
    const otherCookie = String(otherLogin.headers['set-cookie']).split(';')[0];
    expect((await app.inject({ method: 'GET', url: `/api/documents/${uploadedDocumentId}`, headers: { cookie: otherCookie } })).statusCode).toBe(403);
    const adminLogin = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'admin@colegio.example' } });
    const adminCookie = String(adminLogin.headers['set-cookie']).split(';')[0];
    expect((await app.inject({ method: 'GET', url: `/api/documents/${uploadedDocumentId}`, headers: { cookie: adminCookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/documents/${uploadedExternalDocumentId}`, headers: { cookie: adminCookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/documents/${uploadedExternalDocumentId}`, headers: { cookie: otherCookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/api/documents/${uploadedDocumentId}` })).statusCode).toBe(401);
    expect(logOutput).toContain(uploadedDocumentId);
    expect(logOutput).not.toContain('identidad.png');
    expect(logOutput).not.toContain('Camila');
    expect(logOutput).not.toContain('+56900000002');
  });
});
