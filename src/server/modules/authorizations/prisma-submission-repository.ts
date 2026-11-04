import { Prisma, PrismaClient } from '@prisma/client';
import type { AuthorizationSubmissionRepository, SubmissionResult } from './authorization-submission-service.js';

export class PrismaAuthorizationSubmissionRepository implements AuthorizationSubmissionRepository {
  constructor(private readonly database: PrismaClient) {}

  findSubmission(guardianId: string, idempotencyKey: string) {
    return this.database.authorizationSubmission.findUnique({
      where: { guardianId_idempotencyKey: { guardianId, idempotencyKey } },
      select: { id: true, documentId: true, status: true, resultSnapshot: true },
    });
  }

  async createSubmission(input: { guardianId: string; idempotencyKey: string; sessionId: string; ip?: string; userAgent?: string }) {
    try {
      return await this.database.authorizationSubmission.create({ data: input, select: { id: true, documentId: true, status: true, resultSnapshot: true } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.findSubmission(input.guardianId, input.idempotencyKey);
        if (existing) return existing;
      }
      throw error;
    }
  }

  async attachDocument(submissionId: string, guardianId: string, documentId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.database.$transaction(async (transaction) => {
          const claimed = await transaction.$executeRaw`UPDATE document SET claim_version = claim_version + 1 WHERE id = ${documentId}::uuid`;
          if (claimed !== 1) return false;
          const owned = await transaction.document.findFirst({
            where: {
              id: documentId,
              ownerId: guardianId,
              type: 'GUARDIAN_IDENTITY',
              deletedAt: null,
              deleteAfter: { gt: new Date() },
              predecessorDocumentId: null,
              submissions: { none: {} },
              pickupGuardianRequest: null,
              externalPerson: null,
            },
            select: { id: true },
          });
          if (!owned) return false;
          try {
            const result = await transaction.authorizationSubmission.updateMany({ where: { id: submissionId, guardianId, documentId: null }, data: { documentId } });
            return result.count === 1;
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
            throw error;
          }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const serializationFailure = error instanceof Prisma.PrismaClientKnownRequestError
          && (error.code === 'P2034' || (error.code === 'P2010' && error.meta?.code === '40001'));
        if (serializationFailure && attempt < 2) continue;
        if (serializationFailure) return false;
        throw error;
      }
    }
    return false;
  }

  async getPairContext(guardianId: string, eventId: string, studentId: string) {
    const [link, student, event, signed] = await Promise.all([
      this.database.guardianStudent.findUnique({ where: { guardianId_studentId: { guardianId, studentId } }, select: { id: true } }),
      this.database.student.findUnique({ where: { id: studentId }, select: { id: true, courseId: true, isActive: true, firstName: true, paternalSurname: true, maternalSurname: true } }),
      this.database.event.findUnique({
        where: { id: eventId },
        include: { courses: { select: { courseId: true } }, exceptions: { select: { studentId: true, mode: true } } },
      }),
      this.database.authorization.findFirst({ where: { eventId, studentId, status: 'SIGNED' }, select: { id: true } }),
    ]);
    return {
      linked: Boolean(link),
      student,
      event: event ? {
        id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt,
        authorizationText: event.authorizationText, deadlineAt: event.deadlineAt, status: event.status,
        courseIds: event.courses.map(({ courseId }) => courseId),
        exceptions: new Map(event.exceptions.map(({ studentId: exceptionStudentId, mode }) => [exceptionStudentId, mode])),
      } : null,
      signed: Boolean(signed),
    };
  }

  async createAuthorization(input: Record<string, unknown>) {
    const row = await this.database.authorization.create({ data: input as Prisma.AuthorizationUncheckedCreateInput, select: { id: true } });
    return row.id;
  }

  async completeSubmission(submissionId: string, result: SubmissionResult) {
    await this.database.authorizationSubmission.update({ where: { id: submissionId }, data: { status: 'PROCESSED', resultSnapshot: result as unknown as Prisma.InputJsonValue } });
  }
}
