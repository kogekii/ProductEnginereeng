import { describe, expect, it } from 'vitest';
import { AdminTrackingService, type AdminTrackingEvent, type AdminTrackingRepository, type AdminTrackingStudent } from '../../src/server/modules/admin/admin-tracking-service.js';

const now = new Date('2026-11-15T12:00:00.000Z');
const students: AdminTrackingStudent[] = [
  { id: 'student-1', courseId: 'course-1', isActive: true, firstName: 'Ana', paternalSurname: 'Ejemplo', maternalSurname: null, courseName: '1° básico A', guardians: [{ firstName: 'Rosa', paternalSurname: 'Apoderada', maternalSurname: null, email: 'rosa@example.test', phoneE164: '+56912345678' }] },
  { id: 'student-2', courseId: 'course-1', isActive: true, firstName: 'Benjamín', paternalSurname: 'Ejemplo', maternalSurname: null, courseName: '1° básico A', guardians: [{ firstName: 'Luis', paternalSurname: 'Apoderado', maternalSurname: null, email: null, phoneE164: '+56912345679' }] },
  { id: 'student-3', courseId: 'course-2', isActive: true, firstName: 'Carla', paternalSurname: 'Ejemplo', maternalSurname: null, courseName: '2° básico A', guardians: [] },
];

function event(id: string, startsAt: string, courseIds: string[], signedStudentIds: string[] = [], status: 'PUBLISHED' | 'CLOSED' = 'PUBLISHED', endsAt = '2026-12-31T12:00:00.000Z'): AdminTrackingEvent {
  return { id, title: id, startsAt: new Date(startsAt), endsAt: new Date(endsAt), deadlineAt: new Date('2026-12-30T12:00:00.000Z'), status, courseIds, exceptions: new Map(), signedStudentIds: new Set(signedStudentIds) };
}

describe('AdminTrackingService', () => {
  it('filtra por ventana y curso, cuenta pendientes y detalla contactos de apoderados', async () => {
    const current = event('current', '2026-11-20T12:00:00.000Z', ['course-1'], ['student-1']);
    const next = event('next', '2026-12-20T12:00:00.000Z', ['course-2'], ['student-3'], 'CLOSED');
    const repository: AdminTrackingRepository = {
      listEvents: async () => ({ events: [current, next, event('past-month', '2026-10-20T12:00:00.000Z', ['course-1']), event('too-far', '2027-01-01T12:00:00.000Z', ['course-1']), event('occurred', '2026-11-01T12:00:00.000Z', ['course-1'], [], 'PUBLISHED', '2026-11-10T12:00:00.000Z')], students }),
      listCourses: async () => [{ id: 'course-1', name: '1° básico A' }, { id: 'course-2', name: '2° básico A' }],
      getEvent: async (eventId) => ({ event: current, students }).event.id === eventId ? { event: current, students } : null,
    };
    const service = new AdminTrackingService(repository, () => now);
    expect(await service.events()).toEqual([
      { id: 'current', title: 'current', startsAt: current.startsAt, status: 'PUBLISHED', applicableCount: 2, pendingCount: 1, complete: false },
      { id: 'next', title: 'next', startsAt: next.startsAt, status: 'CLOSED', applicableCount: 1, pendingCount: 0, complete: true },
    ]);
    expect(await service.events(['course-1'])).toHaveLength(1);
    expect(await service.events(['course-1', 'course-2'])).toHaveLength(2);
    expect(await service.events(['no-event-course'])).toEqual([]);
    await expect(service.pending('current')).resolves.toEqual({
      event: { id: 'current', title: 'current', status: 'PUBLISHED' },
      students: [{ id: 'student-2', fullName: 'Benjamín Ejemplo', courseName: '1° básico A', guardians: [{ fullName: 'Luis Apoderado', email: null, phone: '+56912345679' }] }],
    });
  });
});
