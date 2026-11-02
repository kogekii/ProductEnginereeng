import { randomUUID, createHash } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/server/lib/prisma.js';

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)('índice único parcial de autorizaciones (PostgreSQL)', () => {
  afterAll(async () => prisma.$disconnect());

  it('impide dos firmas vigentes y permite firmar nuevamente tras una anulación', async () => {
    const userId = randomUUID();
    const courseId = randomUUID();
    const studentId = randomUUID();
    const eventId = randomUUID();
    const sessionId = randomUUID();
    const documentId = randomUUID();
    const submissionId = randomUUID();
    const at = new Date(Date.now() + 60_000);
    const authorizationTextSnapshot = 'Autorización de prueba.';
    const authorizationTextHash = createHash('sha256').update(authorizationTextSnapshot).digest('hex');

    try {
      await prisma.user.create({ data: { id: userId, email: `${userId}@example.test`, firstName: 'Test', paternalSurname: 'Integración' } });
      await prisma.course.create({ data: { id: courseId, name: `Curso ${userId}`, level: '1° básico', year: 2099 } });
      await prisma.student.create({ data: { id: studentId, documentType: 'RUN', documentNumber: `TEST-${userId}`, firstName: 'Estudiante', paternalSurname: 'Prueba', courseId } });
      await prisma.event.create({ data: { id: eventId, type: 'TRIP', title: 'Prueba', description: 'Prueba', startsAt: at, endsAt: at, authorizationText: authorizationTextSnapshot, deadlineAt: at, createdById: userId } });
      await prisma.session.create({ data: { id: sessionId, userId, tokenHash: userId, expiresAt: at } });
      await prisma.document.create({ data: { id: documentId, type: 'GUARDIAN_IDENTITY', privatePath: `test/${documentId}`, mimeType: 'image/png', sizeBytes: 1, sha256: userId, deleteAfter: at } });
      await prisma.authorizationSubmission.create({ data: { id: submissionId, guardianId: userId, idempotencyKey: randomUUID(), sessionId } });

      const base = {
        eventId, studentId, guardianId: userId, submissionId, documentId, sessionId,
        authorizationTextSnapshot, authorizationTextHash, summarySnapshot: { test: true },
      };
      const first = await prisma.authorization.create({ data: base });
      await expect(prisma.authorization.create({ data: { ...base, id: randomUUID() } })).rejects.toMatchObject({ code: 'P2002' });
      await prisma.authorization.update({ where: { id: first.id }, data: { status: 'ANNULLED', annulledAt: new Date(), annulledById: userId, annulmentReason: 'Prueba de índice' } });
      await expect(prisma.authorization.create({ data: { ...base, id: randomUUID() } })).resolves.toMatchObject({ status: 'SIGNED' });
    } finally {
      await prisma.authorization.deleteMany({ where: { eventId } });
      await prisma.authorizationSubmission.deleteMany({ where: { id: submissionId } });
      await prisma.document.deleteMany({ where: { id: documentId } });
      await prisma.session.deleteMany({ where: { id: sessionId } });
      await prisma.event.deleteMany({ where: { id: eventId } });
      await prisma.student.deleteMany({ where: { id: studentId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });
});
