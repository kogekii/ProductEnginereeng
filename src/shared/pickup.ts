import { z } from 'zod';
import { isValidRut, normalizeRut } from './identity.js';

export const pickupStatusSchema = z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED']);
export const externalDocumentTypeSchema = z.enum(['RUT', 'PASSPORT']);

const pickupDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa una fecha válida.').refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}, 'Ingresa una fecha válida.');

export const pickupDayInputSchema = z.object({
  date: pickupDateSchema,
  studentIds: z.array(z.uuid()).min(1, 'Selecciona al menos un estudiante para cada día.'),
}).superRefine(({ studentIds }, context) => {
  if (new Set(studentIds).size !== studentIds.length) {
    context.addIssue({ code: 'custom', message: 'La selección contiene estudiantes repetidos.', path: ['studentIds'] });
  }
});

export const externalPersonInputSchema = z.object({
  firstName: z.string().trim().min(1, 'Ingresa los nombres.').max(100),
  lastName: z.string().trim().min(1, 'Ingresa los apellidos.').max(100),
  documentType: externalDocumentTypeSchema,
  documentNumber: z.string().trim().min(1, 'Ingresa el número de documento.').max(30),
  relationship: z.string().trim().min(1, 'Ingresa el vínculo con el estudiante.').max(80),
  documentId: z.uuid(),
}).superRefine((person, context) => {
  if (person.documentType === 'RUT' && !isValidRut(person.documentNumber)) {
    context.addIssue({ code: 'custom', message: 'Ingresa un RUT válido.', path: ['documentNumber'] });
  }
});

export const pickupSubmissionSchema = z.object({
  idempotencyKey: z.uuid(),
  guardianDocumentId: z.uuid(),
  externalPerson: externalPersonInputSchema,
  days: z.array(pickupDayInputSchema).min(1, 'Selecciona al menos un día.'),
}).superRefine(({ guardianDocumentId, externalPerson, days }, context) => {
  if (guardianDocumentId === externalPerson.documentId) {
    context.addIssue({ code: 'custom', message: 'Adjunta un documento distinto para cada persona.', path: ['externalPerson', 'documentId'] });
  }
  const dates = days.map(({ date }) => date);
  if (new Set(dates).size !== dates.length) {
    context.addIssue({ code: 'custom', message: 'La selección contiene días repetidos.', path: ['days'] });
  }
});

export const pickupListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminPickupListQuerySchema = pickupListQuerySchema.extend({
  date: pickupDateSchema.optional(),
  status: pickupStatusSchema.optional(),
});

export const pickupReviewInputSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().trim().max(1000).optional(),
}).superRefine(({ decision, reason }, context) => {
  if (decision === 'REJECT' && !reason) {
    context.addIssue({ code: 'custom', message: 'Ingresa el motivo del rechazo.', path: ['reason'] });
  }
});

export const pickupContextResponseSchema = z.object({
  today: pickupDateSchema,
  currentMonth: z.string().regex(/^\d{4}-\d{2}$/),
  nextMonth: z.string().regex(/^\d{4}-\d{2}$/),
  eligibleDates: z.array(pickupDateSchema),
  students: z.array(z.object({ id: z.uuid(), fullName: z.string().min(1), courseName: z.string().min(1) })),
});

export const pickupSubmissionResponseSchema = z.object({
  pickupRequestId: z.uuid(),
  status: pickupStatusSchema,
});

const pickupPersonResponseSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  documentType: externalDocumentTypeSchema,
  documentNumber: z.string(),
  relationship: z.string(),
  documentId: z.uuid(),
});

const pickupDayResponseSchema = z.object({
  date: pickupDateSchema,
  students: z.array(z.object({ id: z.uuid(), fullName: z.string(), courseName: z.string() })),
});

export const pickupRequestResponseSchema = z.object({
  id: z.uuid(),
  status: pickupStatusSchema,
  submittedAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
  rejectionReason: z.string().nullable(),
  externalPerson: pickupPersonResponseSchema.nullable(),
  days: z.array(pickupDayResponseSchema),
});

export const pickupListResponseSchema = z.object({
  items: z.array(pickupRequestResponseSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});

export const adminPickupListResponseSchema = z.object({
  items: z.array(pickupRequestResponseSchema.extend({
    matchedDays: z.array(pickupDayResponseSchema),
    dayCount: z.number().int().nonnegative(),
    guardian: z.object({ fullName: z.string(), email: z.string().nullable(), phone: z.string().nullable() }),
  })),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});

export const adminPickupDetailResponseSchema = pickupRequestResponseSchema.extend({
  guardian: z.object({ id: z.uuid(), fullName: z.string(), email: z.string().nullable(), phone: z.string().nullable() }),
  documents: z.object({
    guardian: z.object({ id: z.uuid(), available: z.boolean() }),
    external: z.object({ id: z.uuid().nullable(), available: z.boolean() }),
  }),
  reviewedBy: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
});

export type PickupSubmissionInput = z.infer<typeof pickupSubmissionSchema>;
export type PickupDayInput = z.infer<typeof pickupDayInputSchema>;
export type PickupStatus = z.infer<typeof pickupStatusSchema>;
export type ExternalDocumentType = z.infer<typeof externalDocumentTypeSchema>;
export type PickupListQuery = z.infer<typeof pickupListQuerySchema>;
export type AdminPickupListQuery = z.infer<typeof adminPickupListQuerySchema>;
export type PickupReviewInput = z.infer<typeof pickupReviewInputSchema>;

export function normalizeExternalDocument(type: 'RUT' | 'PASSPORT', value: string): string {
  return type === 'RUT' ? normalizeRut(value) : value.trim().toUpperCase();
}
