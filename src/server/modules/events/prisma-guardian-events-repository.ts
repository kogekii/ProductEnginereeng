import type { PrismaClient } from '@prisma/client';
import type { GuardianEventRecord, GuardianEventStudent, GuardianEventsRepository } from './guardian-event-service.js';

export class PrismaGuardianEventsRepository implements GuardianEventsRepository {
  constructor(private readonly database: PrismaClient) {}

  async listForGuardian(guardianId: string) {
    const [links, eventRows] = await Promise.all([
      this.database.guardianStudent.findMany({
        where: { guardianId, student: { isActive: true } },
        select: { student: { select: { id: true, firstName: true, paternalSurname: true, maternalSurname: true, courseId: true, isActive: true } } },
      }),
      this.database.event.findMany({
        where: { status: 'PUBLISHED', deadlineAt: { gt: new Date() }, endsAt: { gt: new Date() } },
        include: {
          courses: { select: { courseId: true } },
          exceptions: { select: { studentId: true, mode: true } },
          authorizations: { where: { status: 'SIGNED' }, select: { studentId: true } },
        },
      }),
    ]);

    const students: GuardianEventStudent[] = links.map(({ student }) => student);
    const events: GuardianEventRecord[] = eventRows.map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      deadlineAt: event.deadlineAt,
      purpose: event.authorizationText,
      status: event.status,
      courseIds: event.courses.map(({ courseId }) => courseId),
      exceptions: new Map(event.exceptions.map(({ studentId, mode }) => [studentId, mode])),
      signedStudentIds: new Set(event.authorizations.map(({ studentId }) => studentId)),
    }));
    return { students, events };
  }
}
