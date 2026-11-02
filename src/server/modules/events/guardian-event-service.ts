import { EventApplicabilityService, type ApplicableEvent, type StudentForEvent } from './event-applicability-service.js';

export interface GuardianEventStudent extends StudentForEvent {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string | null;
}
export interface GuardianEventRecord extends ApplicableEvent {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  purpose: string;
  courseIds: string[];
  exceptions: Map<string, 'INCLUDE' | 'EXCLUDE'>;
  signedStudentIds: Set<string>;
}
export interface GuardianEventsRepository {
  listForGuardian(guardianId: string): Promise<{ students: GuardianEventStudent[]; events: GuardianEventRecord[] }>;
}

export class GuardianEventService {
  private readonly applicability: EventApplicabilityService;
  constructor(private readonly repository: GuardianEventsRepository, clock: () => Date = () => new Date()) {
    this.applicability = new EventApplicabilityService(clock);
  }

  async list(guardianId: string) {
    const { students, events } = await this.repository.listForGuardian(guardianId);
    const studentById = new Map(students.map((student) => [student.id, student]));
    return events.flatMap((event) => {
      if (!this.applicability.canSign(event)) return [];
      const targetIds = this.applicability.applicableStudentIds(event, students.map(({ id }) => id), students);
      if (targetIds.size === 0) return [];
      const applicableStudents = [...targetIds].map((id) => {
        const student = studentById.get(id)!;
        return {
          id,
          fullName: [student.firstName, student.paternalSurname, student.maternalSurname].filter(Boolean).join(' '),
          alreadyAuthorized: event.signedStudentIds.has(id),
        };
      });
      return [{
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        deadlineAt: event.deadlineAt,
        purpose: event.purpose,
        allAuthorized: applicableStudents.every(({ alreadyAuthorized }) => alreadyAuthorized),
        students: applicableStudents,
      }];
    }).sort((a, b) => a.deadlineAt.getTime() - b.deadlineAt.getTime());
  }
}
