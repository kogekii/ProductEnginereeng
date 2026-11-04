import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { dateInSantiago, isEligiblePickupDate } from '../../src/shared/dates.js';
import { buildApp } from '../../src/server/app.js';
import { loadConfig } from '../../src/server/config.js';
import { prisma } from '../../src/server/lib/prisma.js';

describe.skipIf(!process.env.DATABASE_URL)('solicitudes de retiro externo (PostgreSQL)', () => {
  const app = buildApp(loadConfig({ ...process.env, NODE_ENV: 'test', DEMO_MODE: 'true', LOG_LEVEL: 'silent' }));
  const requestIds: string[] = [];
  const documentIds: string[] = [];
  const eventIds: string[] = [];
  const testStudentIds: string[] = [];
  const authorizationSubmissionKeys: Array<{ guardianId: string; idempotencyKey: string }> = [];

  afterAll(async () => {
    await prisma.pickupActiveSlot.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.pickupItem.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.externalPerson.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.auditLog.deleteMany({ where: { entity: 'PICKUP_REQUEST', entityId: { in: requestIds } } });
    await prisma.pickupRequest.deleteMany({ where: { id: { in: requestIds } } });
    for (const key of authorizationSubmissionKeys) {
      const submission = await prisma.authorizationSubmission.findUnique({ where: { guardianId_idempotencyKey: key }, select: { id: true } });
      if (submission) {
        await prisma.authorization.deleteMany({ where: { submissionId: submission.id } });
        await prisma.authorizationSubmission.deleteMany({ where: { id: submission.id } });
      }
    }
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    const documents = await prisma.document.findMany({ where: { id: { in: documentIds } }, select: { id: true, privatePath: true } });
    await Promise.all(documents.map(({ privatePath }) => rm(privatePath, { force: true })));
    await prisma.document.deleteMany({ where: { id: { in: documentIds } } });
    await prisma.guardianStudent.deleteMany({ where: { studentId: { in: testStudentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: testStudentIds } } });
    await app.close();
  });

  async function createTestStudent() {
    const studentId = randomUUID();
    testStudentIds.push(studentId);
    await prisma.student.create({ data: {
      id: studentId,
      documentType: 'RUN',
      documentNumber: `TEST-${randomUUID()}`,
      firstName: 'Estudiante',
      paternalSurname: 'Prueba',
      maternalSurname: 'Retiros',
      courseId: '20000000-0000-4000-8000-000000000002',
      guardianStudents: { create: { guardianId: '10000000-0000-4000-8000-000000000002', relationship: 'Apoderado' } },
    } });
    return studentId;
  }

  async function login(identifier: string) {
    const response = await app.inject({ method: 'POST', url: '/api/auth/demo-login', payload: { identifier } });
    expect(response.statusCode).toBe(200);
    return String(response.headers['set-cookie']).split(';')[0]!;
  }

  async function uploadDocument(cookie: string, url: string) {
    const boundary = `pickup-${randomUUID()}`;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=', 'base64');
    const preamble = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="respaldo.png"\r\nContent-Type: image/png\r\n\r\n`);
    const ending = Buffer.from(`\r\n--${boundary}--\r\n`);
    const response = await app.inject({ method: 'POST', url, headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: Buffer.concat([preamble, png, ending]) });
    expect(response.statusCode).toBe(201);
    const id = (response.json() as { documentId: string }).documentId;
    documentIds.push(id);
    return id;
  }

  async function eligibleDate(cookie: string) {
    const context = await app.inject({ method: 'GET', url: '/api/guardian/pickups/context', headers: { cookie } });
    expect(context.statusCode).toBe(200);
    const today = (context.json() as { today: string }).today;
    for (let offset = 1; offset <= 62; offset++) {
      const date = new Date(`${today}T00:00:00.000Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      const value = date.toISOString().slice(0, 10);
      if (isEligiblePickupDate(value, new Date(`${today}T18:00:00.000Z`))) return value;
    }
    throw new Error('No encontramos una fecha de prueba elegible.');
  }

  async function createRequest(cookie: string, day: string, studentIds: string[], secondDay?: string) {
    const guardianDocumentId = await uploadDocument(cookie, '/api/documents');
    const externalDocumentId = await uploadDocument(cookie, `/api/documents?type=EXTERNAL_IDENTITY&guardianDocumentId=${guardianDocumentId}`);
    const input = {
      idempotencyKey: randomUUID(), guardianDocumentId,
      externalPerson: { firstName: 'Persona', lastName: 'De Prueba', documentType: 'RUT', documentNumber: '12.345.678-5', relationship: 'Familiar', documentId: externalDocumentId },
      days: [{ date: day, studentIds }, ...(secondDay ? [{ date: secondDay, studentIds }] : [])],
    };
    const response = await app.inject({ method: 'POST', url: '/api/guardian/pickups', headers: { cookie }, payload: input });
    expect(response.statusCode).toBe(201);
    const requestId = (response.json() as { pickupRequestId: string }).pickupRequestId;
    requestIds.push(requestId);
    return { requestId, input, guardianDocumentId, externalDocumentId };
  }

  it('crea de forma idempotente, permite revisar el lote y protege la fecha activa', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/guardian/pickups/context' })).statusCode).toBe(401);
    const guardianCookie = await login('apoderado1@colegio.example');
    const otherGuardianCookie = await login('apoderado2@colegio.example');
    const adminCookie = await login('admin@colegio.example');
    expect((await app.inject({ method: 'GET', url: '/api/guardian/pickups/context', headers: { cookie: adminCookie } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/api/admin/pickups', headers: { cookie: guardianCookie } })).statusCode).toBe(403);
    const day = await eligibleDate(guardianCookie);
    const calendar = await app.inject({ method: 'GET', url: '/api/guardian/pickups/context', headers: { cookie: guardianCookie } });
    const secondDay = (calendar.json() as { eligibleDates: string[] }).eligibleDates.find((value) => value > day)!;
    const sharedStudentId = '30000000-0000-4000-8000-000000000003';
    const created = await createRequest(guardianCookie, day, [sharedStudentId], secondDay);

    const retry = await app.inject({ method: 'POST', url: '/api/guardian/pickups', headers: { cookie: guardianCookie }, payload: { ...created.input, days: [...created.input.days].reverse() } });
    expect(retry.statusCode).toBe(200);
    expect(retry.json()).toMatchObject({ pickupRequestId: created.requestId, status: 'PENDING_REVIEW' });
    const changedPayload = { ...created.input, externalPerson: { ...created.input.externalPerson, lastName: 'Otro' } };
    const reusedKey = await app.inject({ method: 'POST', url: '/api/guardian/pickups', headers: { cookie: guardianCookie }, payload: changedPayload });
    expect(reusedKey.statusCode).toBe(409);
    expect(reusedKey.json()).toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });

    const secondRequest = await createRequest(guardianCookie, secondDay, ['30000000-0000-4000-8000-000000000001']);

    const ownList = await app.inject({ method: 'GET', url: '/api/guardian/pickups?pageSize=1&page=1', headers: { cookie: guardianCookie } });
    expect(ownList.statusCode).toBe(200);
    expect(ownList.json()).toMatchObject({ total: 2, pageSize: 1 });
    const ownSecondPage = await app.inject({ method: 'GET', url: '/api/guardian/pickups?pageSize=1&page=2', headers: { cookie: guardianCookie } });
    const pagedIds = [ownList.json(), ownSecondPage.json()].flatMap((body) => (body as { items: Array<{ id: string }> }).items.map(({ id }) => id));
    expect(new Set(pagedIds).size).toBe(2);
    expect(pagedIds).toContain(created.requestId);
    expect(pagedIds).toContain(secondRequest.requestId);
    const notOwn = await app.inject({ method: 'GET', url: `/api/guardian/pickups/${created.requestId}`, headers: { cookie: otherGuardianCookie } });
    expect(notOwn.statusCode).toBe(404);

    const adminList = await app.inject({ method: 'GET', url: `/api/admin/pickups?date=${day}&status=PENDING_REVIEW`, headers: { cookie: adminCookie } });
    expect(adminList.statusCode).toBe(200);
    const filtered = (adminList.json() as { items: Array<{ id: string; dayCount: number; matchedDays: Array<{ date: string }> }> }).items.find(({ id }) => id === created.requestId);
    expect(filtered).toMatchObject({ dayCount: 2, matchedDays: [{ date: day }] });
    const detail = await app.inject({ method: 'GET', url: `/api/admin/pickups/${created.requestId}`, headers: { cookie: adminCookie } });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ status: 'PENDING_REVIEW', documents: { guardian: { available: true }, external: { available: true } } });
    expect((await app.inject({ method: 'GET', url: `/api/documents/${created.guardianDocumentId}`, headers: { cookie: adminCookie } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/documents/${created.externalDocumentId}`, headers: { cookie: adminCookie } })).statusCode).toBe(200);

    const approval = await app.inject({ method: 'POST', url: `/api/admin/pickups/${created.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'APPROVE' } });
    expect(approval.statusCode).toBe(200);
    expect(approval.json()).toMatchObject({ pickupRequestId: created.requestId, status: 'APPROVED' });
    const approved = await app.inject({ method: 'GET', url: `/api/guardian/pickups/${created.requestId}`, headers: { cookie: guardianCookie } });
    expect(approved.json()).toMatchObject({ id: created.requestId, status: 'APPROVED', days: [{ date: day, students: [{ id: sharedStudentId }] }, { date: secondDay, students: [{ id: sharedStudentId }] }] });
    const approvedByDate = await app.inject({ method: 'GET', url: `/api/admin/pickups?date=${day}&status=APPROVED`, headers: { cookie: adminCookie } });
    const approvedRows = (approvedByDate.json() as { items: Array<{ id: string; matchedDays: Array<{ date: string; students: Array<{ id: string; fullName: string; courseName: string }> }> }> }).items;
    expect(approvedRows.find(({ id }) => id === created.requestId)?.matchedDays).toEqual([{ date: day, students: [{ id: sharedStudentId, fullName: 'Sofía Ejemplo Demo', courseName: '3° básico A' }] }]);

    const conflictingGuardianDocumentId = await uploadDocument(otherGuardianCookie, '/api/documents');
    const conflictingExternalDocumentId = await uploadDocument(otherGuardianCookie, `/api/documents?type=EXTERNAL_IDENTITY&guardianDocumentId=${conflictingGuardianDocumentId}`);
    const conflictingIdempotencyKey = randomUUID();
    const conflict = await app.inject({ method: 'POST', url: '/api/guardian/pickups', headers: { cookie: otherGuardianCookie }, payload: {
      idempotencyKey: conflictingIdempotencyKey, guardianDocumentId: conflictingGuardianDocumentId,
      externalPerson: { firstName: 'Persona', lastName: 'De Prueba', documentType: 'RUT', documentNumber: '12.345.678-5', relationship: 'Familiar', documentId: conflictingExternalDocumentId },
      days: [{ date: day, studentIds: [sharedStudentId, '30000000-0000-4000-8000-000000000004'] }],
    } });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({ code: 'PICKUP_CONFLICT' });
    expect(await prisma.pickupRequest.count({ where: { guardianId: '10000000-0000-4000-8000-000000000003', idempotencyKey: conflictingIdempotencyKey } })).toBe(0);
  });

  it('reclama el documento del apoderado solo en uno de dos envíos simultáneos de retiro y autorización', async () => {
    const staleRequests = await prisma.pickupRequest.findMany({ where: { externalPerson: { is: { lastName: 'Concurrente' } } }, select: { id: true, guardianDocumentId: true, externalPerson: { select: { documentId: true } } } });
    for (const stale of staleRequests) {
      await prisma.pickupActiveSlot.deleteMany({ where: { requestId: stale.id } });
      await prisma.pickupItem.deleteMany({ where: { requestId: stale.id } });
      await prisma.externalPerson.deleteMany({ where: { requestId: stale.id } });
      await prisma.auditLog.deleteMany({ where: { entity: 'PICKUP_REQUEST', entityId: stale.id } });
      await prisma.pickupRequest.delete({ where: { id: stale.id } });
      const documentRows = await prisma.document.findMany({ where: { id: { in: [stale.guardianDocumentId, stale.externalPerson!.documentId] } }, select: { id: true, privatePath: true } });
      await Promise.all(documentRows.map(({ privatePath }) => rm(privatePath, { force: true })));
      await prisma.document.deleteMany({ where: { id: { in: documentRows.map(({ id }) => id) } } });
    }
    const guardianCookie = await login('apoderado1@colegio.example');
    const guardianId = '10000000-0000-4000-8000-000000000002';
    const studentId = '30000000-0000-4000-8000-000000000002';
    const courseId = '20000000-0000-4000-8000-000000000002';
    const adminId = '10000000-0000-4000-8000-000000000001';
    const eventId = randomUUID();
    const eventStart = new Date(Date.now() + 30 * 86_400_000);
    eventIds.push(eventId);
    await prisma.event.create({ data: {
      id: eventId,
      type: 'TRIP',
      title: 'Evento de prueba de concurrencia',
      description: 'Fixture de integración.',
      startsAt: eventStart,
      endsAt: new Date(eventStart.getTime() + 3_600_000),
      authorizationText: 'Autorizo la participación en la actividad de prueba.',
      deadlineAt: new Date(eventStart.getTime() - 2 * 86_400_000),
      status: 'PUBLISHED',
      createdById: adminId,
      courses: { create: { courseId } },
    } });

    const day = await eligibleDate(guardianCookie);
    const guardianDocumentId = await uploadDocument(guardianCookie, '/api/documents');
    const externalDocumentId = await uploadDocument(guardianCookie, `/api/documents?type=EXTERNAL_IDENTITY&guardianDocumentId=${guardianDocumentId}`);
    const idempotencyKey = randomUUID();
    authorizationSubmissionKeys.push({ guardianId, idempotencyKey });
    const [pickupResult, authorizationResult] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/guardian/pickups', headers: { cookie: guardianCookie }, payload: {
        idempotencyKey: randomUUID(), guardianDocumentId,
        externalPerson: { firstName: 'Persona', lastName: 'Concurrente', documentType: 'RUT', documentNumber: '12.345.678-5', relationship: 'Familiar', documentId: externalDocumentId },
        days: [{ date: day, studentIds: [studentId] }],
      } }),
      app.inject({ method: 'POST', url: '/api/guardian/authorizations/submissions', headers: { cookie: guardianCookie }, payload: {
        idempotencyKey, documentId: guardianDocumentId, pairs: [{ eventId, studentId }],
      } }),
    ]);
    const pickupSucceeded = pickupResult.statusCode === 201;
    const authorizationSucceeded = authorizationResult.statusCode === 200 && (authorizationResult.json() as { createdCount: number }).createdCount === 1;
    if (pickupSucceeded) requestIds.push((pickupResult.json() as { pickupRequestId: string }).pickupRequestId);
    expect(Number(pickupSucceeded) + Number(authorizationSucceeded), JSON.stringify({ pickupStatus: pickupResult.statusCode, pickupCode: pickupResult.json().code, authorizationStatus: authorizationResult.statusCode, authorizationResult: authorizationResult.json() })).toBe(1);
    expect([400, 409, 201, 200].includes(pickupResult.statusCode), JSON.stringify(pickupResult.json())).toBe(true);
    expect([400, 409, 200].includes(authorizationResult.statusCode), JSON.stringify(authorizationResult.json())).toBe(true);
  });

  it('rechaza el lote completo con motivo, libera sus fechas y conserva el historial', async () => {
    const guardianCookie = await login('apoderado1@colegio.example');
    const adminCookie = await login('admin@colegio.example');
    const day = await eligibleDate(guardianCookie);
    const studentId = '30000000-0000-4000-8000-000000000001';
    const initial = await createRequest(guardianCookie, day, [studentId]);

    const missingReason = await app.inject({ method: 'POST', url: `/api/admin/pickups/${initial.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'REJECT', reason: '   ' } });
    expect(missingReason.statusCode).toBe(400);
    expect((await prisma.pickupRequest.findUnique({ where: { id: initial.requestId }, select: { status: true } }))?.status).toBe('PENDING_REVIEW');

    const rejected = await app.inject({ method: 'POST', url: `/api/admin/pickups/${initial.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'REJECT', reason: 'El documento no se distingue.' } });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.json()).toMatchObject({ status: 'REJECTED' });
    expect(await prisma.pickupActiveSlot.count({ where: { requestId: initial.requestId } })).toBe(0);

    const visible = await app.inject({ method: 'GET', url: `/api/guardian/pickups/${initial.requestId}`, headers: { cookie: guardianCookie } });
    expect(visible.json()).toMatchObject({ status: 'REJECTED', rejectionReason: 'El documento no se distingue.' });
    const secondRequest = await createRequest(guardianCookie, day, [studentId]);
    expect(secondRequest.requestId).not.toBe(initial.requestId);

    const auditCount = await prisma.auditLog.count({ where: { entity: 'PICKUP_REQUEST', entityId: initial.requestId, action: 'PICKUP_REJECTED' } });
    expect(auditCount).toBe(1);
    const repeatedReview = await app.inject({ method: 'POST', url: `/api/admin/pickups/${initial.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'APPROVE' } });
    expect(repeatedReview.statusCode).toBe(409);
  });

  it('registra una sola decisión cuando dos revisiones ocurren al mismo tiempo', async () => {
    const guardianCookie = await login('apoderado1@colegio.example');
    const adminCookie = await login('admin@colegio.example');
    const request = await createRequest(guardianCookie, await eligibleDate(guardianCookie), [await createTestStudent()]);
    const reviews = await Promise.all([
      app.inject({ method: 'POST', url: `/api/admin/pickups/${request.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'APPROVE' } }),
      app.inject({ method: 'POST', url: `/api/admin/pickups/${request.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'REJECT', reason: 'Revisión de concurrencia.' } }),
    ]);
    expect(reviews.map(({ statusCode }) => statusCode).sort()).toEqual([200, 409]);
    const current = await prisma.pickupRequest.findUnique({ where: { id: request.requestId }, select: { status: true } });
    expect(['APPROVED', 'REJECTED']).toContain(current?.status);
    expect(await prisma.auditLog.count({ where: { entity: 'PICKUP_REQUEST', entityId: request.requestId, action: { in: ['PICKUP_APPROVED', 'PICKUP_REJECTED'] } } })).toBe(1);
    expect(await prisma.pickupActiveSlot.count({ where: { requestId: request.requestId } })).toBe(current?.status === 'APPROVED' ? 1 : 0);
  });

  it('impide aprobar si falta el archivo privado de cualquiera de las dos personas', async () => {
    const guardianCookie = await login('apoderado1@colegio.example');
    const adminCookie = await login('admin@colegio.example');
    const request = await createRequest(guardianCookie, await eligibleDate(guardianCookie), [await createTestStudent()]);
    const external = await prisma.document.findUniqueOrThrow({ where: { id: request.externalDocumentId }, select: { privatePath: true } });
    await rm(external.privatePath, { force: true });
    const detail = await app.inject({ method: 'GET', url: `/api/admin/pickups/${request.requestId}`, headers: { cookie: adminCookie } });
    expect(detail.json()).toMatchObject({ documents: { guardian: { available: true }, external: { available: false } } });
    const review = await app.inject({ method: 'POST', url: `/api/admin/pickups/${request.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'APPROVE' } });
    expect(review.statusCode).toBe(409);
    expect(review.json()).toMatchObject({ code: 'DOCUMENT_UNAVAILABLE' });
  });

  it('permite aprobar el mismo día y bloquea un lote que incluye una fecha pasada', async () => {
    const guardianCookie = await login('apoderado1@colegio.example');
    const adminCookie = await login('admin@colegio.example');
    const today = dateInSantiago(new Date());
    const todayDate = new Date(`${today}T00:00:00.000Z`);
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const todayRequest = await createRequest(guardianCookie, await eligibleDate(guardianCookie), [await createTestStudent()]);
    const todayItem = await prisma.pickupItem.findFirstOrThrow({ where: { requestId: todayRequest.requestId }, select: { id: true, studentId: true, pickupDate: true } });
    await prisma.$transaction(async (transaction) => {
      await transaction.pickupActiveSlot.delete({ where: { studentId_pickupDate: { studentId: todayItem.studentId, pickupDate: todayItem.pickupDate } } });
      await transaction.pickupItem.update({ where: { id: todayItem.id }, data: { pickupDate: todayDate } });
      await transaction.pickupActiveSlot.create({ data: { itemId: todayItem.id, requestId: todayRequest.requestId, studentId: todayItem.studentId, pickupDate: todayDate } });
    });
    const sameDayApproval = await app.inject({ method: 'POST', url: `/api/admin/pickups/${todayRequest.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'APPROVE' } });
    expect(sameDayApproval.statusCode).toBe(200);

    const pastRequest = await createRequest(guardianCookie, await eligibleDate(guardianCookie), [await createTestStudent()]);
    const pastItem = await prisma.pickupItem.findFirstOrThrow({ where: { requestId: pastRequest.requestId }, select: { id: true, studentId: true, pickupDate: true } });
    await prisma.$transaction(async (transaction) => {
      await transaction.pickupActiveSlot.delete({ where: { studentId_pickupDate: { studentId: pastItem.studentId, pickupDate: pastItem.pickupDate } } });
      await transaction.pickupItem.update({ where: { id: pastItem.id }, data: { pickupDate: yesterdayDate } });
      await transaction.pickupActiveSlot.create({ data: { itemId: pastItem.id, requestId: pastRequest.requestId, studentId: pastItem.studentId, pickupDate: yesterdayDate } });
    });
    const pastApproval = await app.inject({ method: 'POST', url: `/api/admin/pickups/${pastRequest.requestId}/review`, headers: { cookie: adminCookie }, payload: { decision: 'APPROVE' } });
    expect(pastApproval.statusCode).toBe(422);
    expect(pastApproval.json()).toMatchObject({ code: 'PICKUP_DATES_EXPIRED' });
    expect((await prisma.pickupRequest.findUnique({ where: { id: pastRequest.requestId }, select: { status: true } }))?.status).toBe('PENDING_REVIEW');
  });
});
