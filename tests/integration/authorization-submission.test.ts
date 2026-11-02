import { randomUUID } from 'node:crypto';
import { access, rm } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { loadConfig } from '../../src/server/config.js';
import { prisma } from '../../src/server/lib/prisma.js';

describe.skipIf(!process.env.DATABASE_URL)('envío de autorizaciones (PostgreSQL)', () => {
  const app = buildApp(loadConfig({ ...process.env, NODE_ENV: 'test', DEMO_MODE: 'true', LOG_LEVEL: 'silent' }));
  const submissionIds: string[] = [];
  let concurrencyFixture: { eventId: string; studentId: string; courseId: string } | undefined;
  afterAll(async () => {
    for (const submissionId of submissionIds) {
      await prisma.authorization.deleteMany({ where: { submissionId } });
      const submission = await prisma.authorizationSubmission.findUnique({ where: { id: submissionId }, select: { documentId: true } });
      if (submission?.documentId) {
        const document = await prisma.document.findUnique({ where: { id: submission.documentId }, select: { privatePath: true } });
        if (document) await rm(document.privatePath, { force: true });
      }
      await prisma.authorizationSubmission.deleteMany({ where: { id: submissionId } });
      if (submission?.documentId) await prisma.document.deleteMany({ where: { id: submission.documentId } });
    }
    if (concurrencyFixture) {
      await prisma.guardianStudent.deleteMany({ where: { guardianId: '10000000-0000-4000-8000-000000000004', studentId: concurrencyFixture.studentId } });
      await prisma.eventCourse.deleteMany({ where: { eventId: concurrencyFixture.eventId } });
      await prisma.event.deleteMany({ where: { id: concurrencyFixture.eventId } });
      await prisma.student.deleteMany({ where: { id: concurrencyFixture.studentId } });
      await prisma.course.deleteMany({ where: { id: concurrencyFixture.courseId } });
    }
    await app.close();
  });

  it('crea los pares válidos, informa los fallidos e idempotentemente repite el resultado', async () => {
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado2@colegio.example' } });
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const payload = {
      idempotencyKey: randomUUID(),
      pairs: [
        { eventId: '40000000-0000-4000-8000-000000000001', studentId: '30000000-0000-4000-8000-000000000004' },
        { eventId: '40000000-0000-4000-8000-000000000001', studentId: '30000000-0000-4000-8000-000000000005' },
        { eventId: '40000000-0000-4000-8000-000000000001', studentId: '30000000-0000-4000-8000-000000000001' },
      ],
    };
    const response = await app.inject({ method: 'POST', url: '/api/guardian/authorizations/submissions', headers: { cookie }, payload });
    expect(response.statusCode).toBe(200);
    const result = response.json() as { submissionId: string; createdCount: number; failedCount: number; created: Array<{ authorizationId: string }>; failed: Array<{ code: string }> };
    submissionIds.push(result.submissionId);
    expect(result.createdCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.failed[0]?.code).toBe('STUDENT_NOT_LINKED');
    const authorizations = await prisma.authorization.findMany({ where: { submissionId: result.submissionId }, select: { documentId: true, summarySnapshot: true } });
    expect(authorizations).toHaveLength(2);
    expect(new Set(authorizations.map(({ documentId }) => documentId)).size).toBe(1);
    expect(new Set(authorizations.map(({ summarySnapshot }) => JSON.stringify(summarySnapshot))).size).toBe(2);
    const document = await prisma.document.findUnique({ where: { id: authorizations[0]!.documentId }, select: { ownerId: true, privatePath: true, isSimulated: true } });
    expect(document).toMatchObject({ ownerId: '10000000-0000-4000-8000-000000000003', isSimulated: true });
    expect(document?.privatePath.toLowerCase()).not.toContain('public');
    await access(document!.privatePath);

    const retry = await app.inject({ method: 'POST', url: '/api/guardian/authorizations/submissions', headers: { cookie }, payload });
    expect(retry.json()).toEqual(result);
    expect(await prisma.authorization.count({ where: { submissionId: result.submissionId } })).toBe(2);
  });

  it('responde 401 sin sesión y 400 cuando el lote es inválido', async () => {
    const unauthenticated = await app.inject({ method: 'POST', url: '/api/guardian/authorizations/submissions', payload: {} });
    expect(unauthenticated.statusCode).toBe(401);
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado1@colegio.example' } });
    const cookie = String(login.headers['set-cookie']).split(';')[0];
    const invalid = await app.inject({ method: 'POST', url: '/api/guardian/authorizations/submissions', headers: { cookie }, payload: { idempotencyKey: randomUUID(), pairs: [] } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({ code: 'INVALID_SELECTION' });
    const adminLogin = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'admin@colegio.example' } });
    const adminCookie = String(adminLogin.headers['set-cookie']).split(';')[0];
    const forbidden = await app.inject({
      method: 'POST', url: '/api/guardian/authorizations/submissions', headers: { cookie: adminCookie },
      payload: { idempotencyKey: randomUUID(), pairs: [{ eventId: '40000000-0000-4000-8000-000000000001', studentId: '30000000-0000-4000-8000-000000000001' }] },
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('resuelve dos envíos concurrentes del mismo par con una sola autorización vigente', async () => {
    const courseId = randomUUID();
    const studentId = randomUUID();
    const eventId = randomUUID();
    concurrencyFixture = { eventId, studentId, courseId };
    await prisma.course.create({ data: { id: courseId, name: `Curso de concurrencia ${courseId}`, level: '3° básico', year: 2099 } });
    await prisma.student.create({ data: { id: studentId, documentType: 'RUN', documentNumber: `TEST-${studentId}`, firstName: 'Estudiante', paternalSurname: 'Temporal', courseId } });
    await prisma.guardianStudent.create({ data: { guardianId: '10000000-0000-4000-8000-000000000004', studentId, relationship: 'Apoderado' } });
    const startsAt = new Date(Date.now() + 2 * 86_400_000);
    await prisma.event.create({ data: {
      id: eventId, type: 'TRIP', title: 'Evento de concurrencia', description: 'Fixture temporal', startsAt,
      endsAt: new Date(startsAt.getTime() + 3_600_000), authorizationText: 'Autorizo la actividad.',
      deadlineAt: new Date(startsAt.getTime() - 86_400_000), status: 'PUBLISHED', createdById: '10000000-0000-4000-8000-000000000001',
    } });
    await prisma.eventCourse.create({ data: { eventId, courseId } });
    const [loginOne, loginTwo] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado3@colegio.example' } }),
      app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier: 'apoderado3@colegio.example' } }),
    ]);
    const cookies = [loginOne, loginTwo].map((login) => String(login.headers['set-cookie']).split(';')[0]);
    const pair = { eventId, studentId };
    const results = await Promise.all(cookies.map(async (cookie) => {
      const response = await app.inject({ method: 'POST', url: '/api/guardian/authorizations/submissions', headers: { cookie }, payload: { idempotencyKey: randomUUID(), pairs: [pair] } });
      expect(response.statusCode).toBe(200);
      return response.json() as { submissionId: string; createdCount: number; failed: Array<{ code: string }> };
    }));
    submissionIds.push(...results.map(({ submissionId }) => submissionId));
    expect(results.reduce((total, result) => total + result.createdCount, 0)).toBe(1);
    expect(results.flatMap(({ failed }) => failed).map(({ code }) => code)).toContain('ALREADY_AUTHORIZED');
    expect(await prisma.authorization.count({ where: { eventId: pair.eventId, studentId: pair.studentId, status: 'SIGNED' } })).toBe(1);
  });
});
