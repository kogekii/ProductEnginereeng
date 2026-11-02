import { describe, expect, it } from 'vitest';
import { GuardianEventService, type GuardianEventRecord, type GuardianEventsRepository } from '../../src/server/modules/events/guardian-event-service.js';

const now = new Date('2026-11-01T12:00:00.000Z');
const student = { id: 'student-1', courseId: 'course-1', isActive: true, firstName: 'Estudiante', paternalSurname: 'Ejemplo', maternalSurname: null };
const event = (id: string, deadlineDays: number, status: GuardianEventRecord['status'] = 'PUBLISHED'): GuardianEventRecord => ({
  id, title: id, startsAt: new Date('2026-11-20T15:00:00.000Z'), endsAt: new Date('2026-11-20T16:00:00.000Z'),
  purpose: 'Actividad escolar', deadlineAt: new Date(now.getTime() + deadlineDays * 86_400_000), status,
  courseIds: ['course-1'], exceptions: new Map(), signedStudentIds: new Set(),
});

describe('GuardianEventService', () => {
  it('filtra eventos no firmables, limita los estudiantes al apoderado y marca eventos completos', async () => {
    const complete = event('complete', 1);
    complete.signedStudentIds.add(student.id);
    const repository: GuardianEventsRepository = {
      listForGuardian: async () => ({
        students: [student],
        events: [event('later', 2), complete, event('closed', 1, 'CLOSED')],
      }),
    };
    const service = new GuardianEventService(repository, () => now);
    const events = await service.list('guardian-1');
    expect(events.map(({ id }) => id)).toEqual(['complete', 'later']);
    expect(events[0]?.allAuthorized).toBe(true);
    expect(events[0]?.students).toEqual([{ id: student.id, fullName: 'Estudiante Ejemplo', alreadyAuthorized: true }]);
    expect(events[1]?.allAuthorized).toBe(false);
  });
});
