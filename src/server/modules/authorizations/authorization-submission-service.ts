import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { AuthorizationSubmissionInput } from '../../../shared/authorization.js';
import { EventApplicabilityService, type ApplicableEvent, type StudentForEvent } from '../events/event-applicability-service.js';

export type PairErrorCode = 'STUDENT_NOT_LINKED' | 'STUDENT_NOT_APPLICABLE' | 'EVENT_NOT_SIGNALABLE' | 'DEADLINE_PASSED' | 'ALREADY_AUTHORIZED';
interface StudentContext extends StudentForEvent { firstName: string; paternalSurname: string; maternalSurname: string | null }
interface EventContext extends ApplicableEvent { id: string; title: string; startsAt: Date; authorizationText: string }
export interface AuthorizationSubmissionRepository {
  findSubmission(guardianId: string, idempotencyKey: string): Promise<{ id: string; documentId: string | null; status: string; resultSnapshot: unknown } | null>;
  createSubmission(input: { guardianId: string; idempotencyKey: string; sessionId: string; ip?: string; userAgent?: string }): Promise<{ id: string; documentId: string | null; status: string; resultSnapshot: unknown }>;
  attachDocument(submissionId: string, guardianId: string, documentId: string): Promise<boolean>;
  getPairContext(guardianId: string, eventId: string, studentId: string): Promise<{ linked: boolean; student: StudentContext | null; event: EventContext | null; signed: boolean }>;
  createAuthorization(input: Record<string, unknown>): Promise<string>;
  completeSubmission(submissionId: string, result: SubmissionResult): Promise<void>;
}

export interface SubmissionResult {
  submissionId: string;
  created: Array<{ eventId: string; studentId: string; authorizationId: string }>;
  failed: Array<{ eventId: string; studentId: string; code: PairErrorCode; message: string }>;
  createdCount: number;
  failedCount: number;
}

const failureText: Record<PairErrorCode, string> = {
  STUDENT_NOT_LINKED: 'Este estudiante no está vinculado a tu cuenta.',
  STUDENT_NOT_APPLICABLE: 'Este estudiante no aplica a este evento.',
  EVENT_NOT_SIGNALABLE: 'Este evento ya no permite firmar.',
  DEADLINE_PASSED: 'La fecha límite para firmar ya venció.',
  ALREADY_AUTHORIZED: 'Este estudiante ya tiene una autorización vigente.',
};

export class AuthorizationSubmissionService {
  private readonly applicability: EventApplicabilityService;
  constructor(
    private readonly repository: AuthorizationSubmissionRepository,
    private readonly createDocument: (submissionId: string) => Promise<string>,
    private readonly clock: () => Date = () => new Date(),
  ) { this.applicability = new EventApplicabilityService(clock); }

  async submit(input: AuthorizationSubmissionInput, context: { guardianId: string; sessionId: string; ip?: string; userAgent?: string }): Promise<SubmissionResult> {
    const prior = await this.repository.findSubmission(context.guardianId, input.idempotencyKey);
    if (prior?.status === 'PROCESSED' && prior.resultSnapshot) return prior.resultSnapshot as SubmissionResult;
    const submission = prior ?? await this.repository.createSubmission({
      guardianId: context.guardianId, idempotencyKey: input.idempotencyKey, sessionId: context.sessionId, ip: context.ip, userAgent: context.userAgent,
    });
    let documentId = submission.documentId;
    if (input.documentId && !documentId) {
      if (!await this.repository.attachDocument(submission.id, context.guardianId, input.documentId)) {
        throw new Error('El documento no existe, no te pertenece o ya fue usado en otro envío.');
      }
      documentId = input.documentId;
    }
    documentId ??= await this.createDocument(submission.id);
    const created: SubmissionResult['created'] = [];
    const failed: SubmissionResult['failed'] = [];
    const signedAt = this.clock();

    for (const pair of input.pairs) {
      const pairContext = await this.repository.getPairContext(context.guardianId, pair.eventId, pair.studentId);
      let code: PairErrorCode | undefined;
      if (!pairContext.linked || !pairContext.student?.isActive) code = 'STUDENT_NOT_LINKED';
      else if (!pairContext.event) code = 'EVENT_NOT_SIGNALABLE';
      else if (!this.applicability.targetStudentIds(pairContext.event, [pairContext.student]).has(pair.studentId)) code = 'STUDENT_NOT_APPLICABLE';
      else if (pairContext.event.status !== 'PUBLISHED' || pairContext.event.endsAt <= signedAt) code = 'EVENT_NOT_SIGNALABLE';
      else if (pairContext.event.deadlineAt <= signedAt) code = 'DEADLINE_PASSED';
      else if (pairContext.signed) code = 'ALREADY_AUTHORIZED';

      if (code) {
        failed.push({ ...pair, code, message: failureText[code] });
        continue;
      }
      const student = pairContext.student!;
      const event = pairContext.event!;
      const hash = createHash('sha256').update(event.authorizationText).digest('hex');
      const summarySnapshot = {
        eventId: event.id, eventTitle: event.title, startsAt: event.startsAt.toISOString(),
        studentId: student.id, studentName: [student.firstName, student.paternalSurname, student.maternalSurname].filter(Boolean).join(' '),
        purpose: event.authorizationText, deadlineAt: event.deadlineAt.toISOString(), submissionCount: input.pairs.length,
      };
      try {
        const authorizationId = await this.repository.createAuthorization({
          eventId: event.id, studentId: student.id, guardianId: context.guardianId,
          submissionId: submission.id, documentId, sessionId: context.sessionId, status: 'SIGNED',
          signedAt, ip: context.ip, userAgent: context.userAgent,
          authorizationTextSnapshot: event.authorizationText, authorizationTextHash: hash, summarySnapshot,
        });
        created.push({ ...pair, authorizationId });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          failed.push({ ...pair, code: 'ALREADY_AUTHORIZED', message: failureText.ALREADY_AUTHORIZED });
          continue;
        }
        throw error;
      }
    }

    const result: SubmissionResult = { submissionId: submission.id, created, failed, createdCount: created.length, failedCount: failed.length };
    await this.repository.completeSubmission(submission.id, result);
    return result;
  }
}
