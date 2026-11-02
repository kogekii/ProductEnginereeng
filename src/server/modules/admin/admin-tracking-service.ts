import { startOfMonthInSantiago, startOfNextMonthInSantiago } from '../../../shared/dates.js';
import { EventApplicabilityService, type ApplicableEvent, type StudentForEvent } from '../events/event-applicability-service.js';

export interface AdminTrackingStudent extends StudentForEvent {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string | null;
  courseName: string;
  guardians: Array<{ firstName: string; paternalSurname: string; maternalSurname: string | null; email: string | null; phoneE164: string | null }>;
}
export interface AdminTrackingEvent extends ApplicableEvent {
  id: string;
  title: string;
  startsAt: Date;
  status: 'PUBLISHED' | 'CLOSED';
  courseIds: string[];
  exceptions: Map<string, 'INCLUDE' | 'EXCLUDE'>;
  signedStudentIds: Set<string>;
}
export interface AdminTrackingRepository {
  listEvents(startAt: Date, endAt: Date, now: Date): Promise<{ events: AdminTrackingEvent[]; students: AdminTrackingStudent[] }>;
  listCourses(): Promise<Array<{ id: string; name: string }>>;
  getEvent(eventId: string): Promise<{ event: AdminTrackingEvent; students: AdminTrackingStudent[] } | null>;
}

export class AdminTrackingService {
  private readonly applicability: EventApplicabilityService;
  constructor(private readonly repository: AdminTrackingRepository, private readonly clock: () => Date = () => new Date()) {
    this.applicability = new EventApplicabilityService(clock);
  }

  courses() { return this.repository.listCourses(); }

  async events(courseIds: string[] = []) {
    const now = this.clock();
    const startAt = startOfMonthInSantiago(now);
    const nextMonth = startOfNextMonthInSantiago(now);
    const endAt = startOfNextMonthInSantiago(nextMonth);
    const { events, students } = await this.repository.listEvents(startAt, endAt, now);
    const selectedCourses = new Set(courseIds);
    return events.flatMap((event) => {
      if (event.startsAt < startAt || event.startsAt >= endAt || event.endsAt <= now) return [];
      const applicableIds = this.applicability.targetStudentIds(event, students)
        .values();
      const scopedIds = [...applicableIds].filter((studentId) => {
        const student = students.find(({ id }) => id === studentId);
        return student && (selectedCourses.size === 0 || selectedCourses.has(student.courseId));
      });
      const applicableCount = scopedIds.length;
      const pendingCount = scopedIds.filter((id) => !event.signedStudentIds.has(id)).length;
      if (selectedCourses.size > 0 && applicableCount === 0) return [];
      return [{
        id: event.id, title: event.title, startsAt: event.startsAt, status: event.status,
        applicableCount, pendingCount, complete: pendingCount === 0,
      }];
    }).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  async pending(eventId: string) {
    const result = await this.repository.getEvent(eventId);
    if (!result) return null;
    const { event, students } = result;
    const now = this.clock();
    const startAt = startOfMonthInSantiago(now);
    const endAt = startOfNextMonthInSantiago(startOfNextMonthInSantiago(now));
    if (event.startsAt < startAt || event.startsAt >= endAt || event.endsAt <= now) return null;
    const targetIds = this.applicability.targetStudentIds(event, students);
    const pending = students.filter(({ id }) => targetIds.has(id) && !event.signedStudentIds.has(id)).map((student) => ({
      id: student.id,
      fullName: [student.firstName, student.paternalSurname, student.maternalSurname].filter(Boolean).join(' '),
      courseName: student.courseName,
      guardians: student.guardians.map((guardian) => ({
        fullName: [guardian.firstName, guardian.paternalSurname, guardian.maternalSurname].filter(Boolean).join(' '),
        email: guardian.email,
        phone: guardian.phoneE164,
    })),
    }));
    return { event: { id: event.id, title: event.title, status: event.status }, students: pending };
  }
}
