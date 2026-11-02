export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';
export type ExceptionMode = 'INCLUDE' | 'EXCLUDE';

export interface ApplicableEvent {
  status: EventStatus;
  deadlineAt: Date;
  endsAt: Date;
  courseIds: string[];
  exceptions: Map<string, ExceptionMode>;
}

export interface StudentForEvent { id: string; courseId: string; isActive: boolean }

export class EventApplicabilityService {
  constructor(private readonly clock: () => Date = () => new Date()) {}

  targetStudentIds(event: ApplicableEvent, students: StudentForEvent[]): Set<string> {
    return new Set(students.filter((student) => {
      if (!student.isActive) return false;
      const exception = event.exceptions.get(student.id);
      if (exception === 'EXCLUDE') return false;
      return exception === 'INCLUDE' || event.courseIds.includes(student.courseId);
    }).map(({ id }) => id));
  }

  canSign(event: ApplicableEvent): boolean {
    const current = this.clock().getTime();
    return event.status === 'PUBLISHED' && current < event.deadlineAt.getTime() && current < event.endsAt.getTime();
  }

  applicableStudentIds(event: ApplicableEvent, guardianStudentIds: string[], students: StudentForEvent[]): Set<string> {
    const guardianIds = new Set(guardianStudentIds);
    return new Set([...this.targetStudentIds(event, students)].filter((id) => guardianIds.has(id)));
  }
}
