import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/server/lib/prisma.js';

describe.skipIf(!process.env.DATABASE_URL)('integridad de solicitudes de retiro (PostgreSQL)', () => {
  const requestId = randomUUID();
  const guardianDocumentId = randomUUID();
  const itemId = randomUUID();
  const guardianId = '10000000-0000-4000-8000-000000000002';
  const sessionId = '50000000-0000-4000-8000-000000000001';
  const studentId = '30000000-0000-4000-8000-000000000001';
  const pickupDate = new Date('2027-01-04T00:00:00.000Z');

  afterAll(async () => {
    await prisma.pickupActiveSlot.deleteMany({ where: { requestId } });
    await prisma.pickupItem.deleteMany({ where: { requestId } });
    await prisma.pickupRequest.deleteMany({ where: { id: requestId } });
    await prisma.document.deleteMany({ where: { id: guardianDocumentId } });
  });

  it('enforce slots únicos por estudiante/fecha y asociados al item exacto', async () => {
    await prisma.document.create({ data: {
      id: guardianDocumentId,
      ownerId: guardianId,
      type: 'GUARDIAN_IDENTITY',
      privatePath: `integration/${guardianDocumentId}.png`,
      mimeType: 'image/png',
      sizeBytes: 1,
      sha256: 'integration-test',
      deleteAfter: new Date('2030-01-01T00:00:00.000Z'),
    } });
    await prisma.pickupRequest.create({ data: {
      id: requestId,
      guardianId,
      guardianDocumentId,
      idempotencyKey: randomUUID(),
      payloadHash: 'integration-test',
      summarySnapshot: {},
      sessionId,
    } });
    await prisma.pickupItem.create({ data: { id: itemId, requestId, studentId, pickupDate } });
    await prisma.pickupActiveSlot.create({ data: { itemId, requestId, studentId, pickupDate } });

    await expect(prisma.pickupActiveSlot.create({ data: {
      itemId: randomUUID(), requestId: randomUUID(), studentId, pickupDate,
    } })).rejects.toMatchObject({ code: 'P2002' });

    await expect(prisma.pickupActiveSlot.create({ data: {
      itemId: randomUUID(), requestId, studentId, pickupDate: new Date('2027-01-05T00:00:00.000Z'),
    } })).rejects.toMatchObject({ code: 'P2003' });
  });
});
