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
    const owned = await this.database.document.findFirst({ where: { id: documentId, ownerId: guardianId, deletedAt: null }, select: { id: true } });
    if (!owned) return false;
    try {
      const result = await this.database.authorizationSubmission.updateMany({ where: { id: submissionId, guardianId, documentId: null }, data: { documentId } });
      return result.count === 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
      throw error;
    }
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
