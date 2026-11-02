import type { EventStatus, PrismaClient } from '@prisma/client';
import type { AdminTrackingEvent, AdminTrackingRepository, AdminTrackingStudent } from './admin-tracking-service.js';

export class PrismaAdminTrackingRepository implements AdminTrackingRepository {
  constructor(private readonly database: PrismaClient) {}

  async listCourses() {
    return this.database.course.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }

  async listEvents(startAt: Date, endAt: Date, now: Date) {
    const [eventRows, students] = await Promise.all([
      this.database.event.findMany({
        where: { status: { in: ['PUBLISHED', 'CLOSED'] }, startsAt: { gte: startAt, lt: endAt }, endsAt: { gt: now } },
        include: { courses: { select: { courseId: true } }, exceptions: { select: { studentId: true, mode: true } }, authorizations: { where: { status: 'SIGNED' }, select: { studentId: true } } },
        orderBy: { startsAt: 'asc' },
      }),
      this.loadStudents(),
    ]);
    return { events: eventRows.filter(({ status }) => status === 'PUBLISHED' || status === 'CLOSED').map((event) => this.mapEvent(event)), students };
  }

  async getEvent(eventId: string) {
    const [event, students] = await Promise.all([
      this.database.event.findUnique({
        where: { id: eventId },
        include: { courses: { select: { courseId: true } }, exceptions: { select: { studentId: true, mode: true } }, authorizations: { where: { status: 'SIGNED' }, select: { studentId: true } } },
      }),
      this.loadStudents(),
    ]);
    if (!event || (event.status !== 'PUBLISHED' && event.status !== 'CLOSED') || event.endsAt <= new Date()) return null;
    return { event: this.mapEvent(event), students };
  }

  private async loadStudents(): Promise<AdminTrackingStudent[]> {
    const rows = await this.database.student.findMany({
      where: { isActive: true },
      include: { course: { select: { name: true } }, guardianStudents: { include: { guardian: { select: { firstName: true, paternalSurname: true, maternalSurname: true, email: true, phoneE164: true } } } } },
    });
    return rows.map((student) => ({
      id: student.id, courseId: student.courseId, isActive: student.isActive,
      firstName: student.firstName, paternalSurname: student.paternalSurname, maternalSurname: student.maternalSurname,
      courseName: student.course.name,
      guardians: student.guardianStudents.map(({ guardian }) => guardian),
    }));
  }

  private mapEvent(event: {
    id: string; title: string; startsAt: Date; endsAt: Date; deadlineAt: Date; status: EventStatus;
    courses: Array<{ courseId: string }>;
    exceptions: Array<{ studentId: string; mode: 'INCLUDE' | 'EXCLUDE' }>;
    authorizations: Array<{ studentId: string }>;
  }): AdminTrackingEvent {
    if (event.status !== 'PUBLISHED' && event.status !== 'CLOSED') throw new Error('El estado del evento no se puede mostrar en el seguimiento.');
    return {
      id: event.id, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, deadlineAt: event.deadlineAt,
      status: event.status, courseIds: event.courses.map(({ courseId }) => courseId),
      exceptions: new Map(event.exceptions.map(({ studentId, mode }) => [studentId, mode])),
      signedStudentIds: new Set(event.authorizations.map(({ studentId }) => studentId)),
    };
  }
}
