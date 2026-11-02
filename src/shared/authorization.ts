import { z } from 'zod';

export const authorizationErrorCodes = [
  'AUTH_REQUIRED', 'FORBIDDEN', 'INVALID_SELECTION', 'STUDENT_NOT_LINKED',
  'STUDENT_NOT_APPLICABLE', 'EVENT_NOT_SIGNALABLE', 'DEADLINE_PASSED',
  'ALREADY_AUTHORIZED', 'PAIR_DUPLICATED',
] as const;

export const authorizationPairSchema = z.object({ eventId: z.uuid(), studentId: z.uuid() });
export const authorizationSubmissionSchema = z.object({
  idempotencyKey: z.uuid(),
  documentId: z.uuid().optional(),
  pairs: z.array(authorizationPairSchema).min(1).max(100),
}).superRefine(({ pairs }, context) => {
  const keys = pairs.map(({ eventId, studentId }) => `${eventId}:${studentId}`);
  if (new Set(keys).size !== keys.length) {
    context.addIssue({ code: 'custom', message: 'La selección contiene pares repetidos.', path: ['pairs'] });
  }
});

export type AuthorizationSubmissionInput = z.infer<typeof authorizationSubmissionSchema>;
