import { describe, expect, it } from 'vitest';
import { authorizationSubmissionSchema } from '../../src/shared/authorization.js';

const eventId = '10000000-0000-4000-8000-000000000001';
const studentId = '20000000-0000-4000-8000-000000000001';
const valid = { idempotencyKey: '30000000-0000-4000-8000-000000000001', pairs: [{ eventId, studentId }] };

describe('schema de envío de autorizaciones', () => {
  it('acepta un envío válido', () => expect(authorizationSubmissionSchema.safeParse(valid).success).toBe(true));
  it('rechaza un lote vacío', () => expect(authorizationSubmissionSchema.safeParse({ ...valid, pairs: [] }).success).toBe(false));
  it('rechaza pares repetidos', () => expect(authorizationSubmissionSchema.safeParse({ ...valid, pairs: [...valid.pairs, ...valid.pairs] }).success).toBe(false));
  it('rechaza más de cien pares', () => expect(authorizationSubmissionSchema.safeParse({ ...valid, pairs: Array.from({ length: 101 }, (_, index) => ({ eventId, studentId: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}` })) }).success).toBe(false));
});
