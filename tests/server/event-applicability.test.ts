import { describe, expect, it } from 'vitest';
import { EventApplicabilityService } from '../../src/server/modules/events/event-applicability-service.js';

const at = new Date('2026-11-01T12:00:00Z');
const service = new EventApplicabilityService(() => at);
const students = [
  { id: 'a', courseId: 'one', isActive: true },
  { id: 'b', courseId: 'two', isActive: true },
  { id: 'c', courseId: 'one', isActive: false },
];
const event = { status: 'PUBLISHED' as const, deadlineAt: new Date('2026-11-02'), endsAt: new Date('2026-11-03'), courseIds: ['one'], exceptions: new Map([['a', 'EXCLUDE' as const], ['b', 'INCLUDE' as const]]) };

describe('aplicabilidad del evento', () => {
  it('aplica cursos, incluye excepciones y resta exclusiones', () => {
    expect([...service.targetStudentIds(event, students)]).toEqual(['b']);
  });
  it('limita los estudiantes al vínculo del apoderado', () => {
    expect([...service.applicableStudentIds(event, ['a'], students)]).toEqual([]);
  });
  it('solo permite firmar un evento publicado antes de su plazo y término', () => {
    expect(service.canSign(event)).toBe(true);
    expect(service.canSign({ ...event, status: 'CLOSED' })).toBe(false);
    expect(service.canSign({ ...event, deadlineAt: new Date('2026-11-01T11:59:00Z') })).toBe(false);
  });
});
