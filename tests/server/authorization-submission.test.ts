import { describe, expect, it } from 'vitest';
import { AuthorizationSubmissionService, type AuthorizationSubmissionRepository } from '../../src/server/modules/authorizations/authorization-submission-service.js';

const at = new Date('2026-11-01T12:00:00.000Z');
const validStudent = { id: 'student', courseId: 'course', isActive: true, firstName: 'Estudiante', paternalSurname: 'Ejemplo', maternalSurname: null };
const makeEvent = (overrides: Partial<{
  status: 'PUBLISHED' | 'DRAFT' | 'CLOSED' | 'CANCELLED'; deadlineAt: Date; endsAt: Date; courseIds: string[]; exceptions: Map<string, 'INCLUDE' | 'EXCLUDE'>;
}> = {}) => ({
  id: 'event', title: 'Salida', startsAt: new Date('2026-11-10T15:00:00.000Z'), authorizationText: 'Autorizo la salida.',
  status: 'PUBLISHED' as const, deadlineAt: new Date('2026-11-09T00:00:00.000Z'), endsAt: new Date('2026-11-10T20:00:00.000Z'),
  courseIds: ['course'], exceptions: new Map<string, 'INCLUDE' | 'EXCLUDE'>(), ...overrides,
});

describe('AuthorizationSubmissionService', () => {
  it('produce resultado parcial para vínculos, aplicabilidad, vigencia y duplicados', async () => {
    const contexts = new Map<string, Awaited<ReturnType<AuthorizationSubmissionRepository['getPairContext']>>>();
    const put = (studentId: string, context: Awaited<ReturnType<AuthorizationSubmissionRepository['getPairContext']>>) => contexts.set(studentId, context);
    put('not-linked', { linked: false, student: validStudent, event: makeEvent(), signed: false });
    put('not-applicable', { linked: true, student: { ...validStudent, id: 'not-applicable', courseId: 'other' }, event: makeEvent(), signed: false });
    put('closed', { linked: true, student: { ...validStudent, id: 'closed' }, event: makeEvent({ status: 'CLOSED' }), signed: false });
    put('deadline', { linked: true, student: { ...validStudent, id: 'deadline' }, event: makeEvent({ deadlineAt: new Date(at.getTime() - 60_000) }), signed: false });
    put('signed', { linked: true, student: { ...validStudent, id: 'signed' }, event: makeEvent(), signed: true });
    put('valid', { linked: true, student: { ...validStudent, id: 'valid' }, event: makeEvent(), signed: false });
    const repository: AuthorizationSubmissionRepository = {
      findSubmission: async () => null,
      createSubmission: async () => ({ id: 'submission', documentId: null, status: 'RECEIVED', resultSnapshot: null }),
      attachDocument: async () => true,
      getPairContext: async (_guardianId, _eventId, studentId) => contexts.get(studentId)!,
      createAuthorization: async () => 'authorization-id',
      completeSubmission: async () => undefined,
    };
    const service = new AuthorizationSubmissionService(repository, async () => 'document', () => at);
    const pairs = ['not-linked', 'not-applicable', 'closed', 'deadline', 'signed', 'valid'].map((studentId) => ({ eventId: 'event', studentId }));
    const result = await service.submit({ idempotencyKey: 'key', pairs }, { guardianId: 'guardian', sessionId: 'session' });
    expect(result.failed.map(({ code }) => code)).toEqual([
      'STUDENT_NOT_LINKED', 'STUDENT_NOT_APPLICABLE', 'EVENT_NOT_SIGNALABLE', 'DEADLINE_PASSED', 'ALREADY_AUTHORIZED',
    ]);
    expect(result.createdCount).toBe(1);
    expect(result.failedCount).toBe(5);
  });
});
