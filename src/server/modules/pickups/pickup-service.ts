import { createHash } from 'node:crypto';
import { normalizeExternalDocument } from '../../../shared/pickup.js';
import type { AdminPickupListQuery, PickupListQuery, PickupSubmissionInput, PickupStatus } from './pickup-types.js';

export type PickupErrorCode = 'INVALID_SELECTION' | 'INVALID_DOCUMENT' | 'PICKUP_NOT_FOUND' | 'PICKUP_CONFLICT' | 'IDEMPOTENCY_CONFLICT' | 'PICKUP_DATES_EXPIRED' | 'REVIEW_CONFLICT' | 'DOCUMENT_UNAVAILABLE' | 'RETRYABLE_ERROR';

const errorStatus: Record<PickupErrorCode, number> = {
  INVALID_SELECTION: 400,
  INVALID_DOCUMENT: 400,
  PICKUP_NOT_FOUND: 404,
  PICKUP_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  PICKUP_DATES_EXPIRED: 422,
  REVIEW_CONFLICT: 409,
  DOCUMENT_UNAVAILABLE: 409,
  RETRYABLE_ERROR: 503,
};

export class PickupServiceError extends Error {
  readonly status: number;
  constructor(readonly code: PickupErrorCode, message: string, readonly details?: unknown) {
    super(message);
    this.name = 'PickupServiceError';
    this.status = errorStatus[code];
  }
}

export interface PickupActor { id: string; isAdmin: boolean }
export interface PickupRequestContext { guardianId: string; sessionId: string; ip?: string; userAgent?: string }
export interface PickupReviewContext { adminId: string; decision: 'APPROVE' | 'REJECT'; reason?: string; ip?: string; userAgent?: string }
export interface PickupRepository {
  context(guardianId: string, now: Date): Promise<unknown>;
  submit(input: PickupSubmissionInput, context: PickupRequestContext, now: Date): Promise<{ pickupRequestId: string; status: PickupStatus; replayed?: boolean }>;
  listForGuardian(guardianId: string, query: PickupListQuery): Promise<unknown>;
  getForGuardian(guardianId: string, id: string): Promise<unknown | null>;
  listForAdmin(query: AdminPickupListQuery): Promise<unknown>;
  getForAdmin(id: string): Promise<unknown | null>;
  review(id: string, context: PickupReviewContext, now: Date): Promise<{ pickupRequestId: string; status: PickupStatus }>;
}

export class PickupService {
  constructor(private readonly repository: PickupRepository, private readonly clock: () => Date = () => new Date()) {}

  context(guardianId: string) {
    return this.repository.context(guardianId, this.clock());
  }

  submit(input: PickupSubmissionInput, context: PickupRequestContext) {
    return this.repository.submit(input, context, this.clock());
  }

  listForGuardian(guardianId: string, query: PickupListQuery) {
    return this.repository.listForGuardian(guardianId, query);
  }

  getForGuardian(guardianId: string, id: string) {
    return this.repository.getForGuardian(guardianId, id);
  }

  listForAdmin(query: AdminPickupListQuery) {
    return this.repository.listForAdmin(query);
  }

  getForAdmin(id: string) {
    return this.repository.getForAdmin(id);
  }

  review(id: string, context: PickupReviewContext) {
    return this.repository.review(id, context, this.clock());
  }
}

export function pickupPayloadHash(input: PickupSubmissionInput): string {
  const normalized = {
    guardianDocumentId: input.guardianDocumentId,
    externalPerson: {
      ...input.externalPerson,
      firstName: input.externalPerson.firstName.trim(),
      lastName: input.externalPerson.lastName.trim(),
      documentNumber: normalizeExternalDocument(input.externalPerson.documentType, input.externalPerson.documentNumber),
      relationship: input.externalPerson.relationship.trim(),
    },
    days: [...input.days]
      .map(({ date, studentIds }) => ({ date, studentIds: [...studentIds].sort() }))
      .sort((left, right) => left.date.localeCompare(right.date)),
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
