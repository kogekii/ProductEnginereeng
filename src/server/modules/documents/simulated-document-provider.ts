import { PrismaClient } from '@prisma/client';
import type { DocumentStorage } from './document-storage.js';

const placeholderPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=', 'base64');

export class SimulatedDocumentProvider {
  constructor(private readonly database: PrismaClient, private readonly storage: DocumentStorage, private readonly retentionDays: number) {}

  async createForSubmission(submissionId: string) {
    return this.database.$transaction(async (transaction) => {
      const [submission] = await transaction.$queryRaw<Array<{ id: string; guardian_id: string; document_id: string | null }>>`
        SELECT id, guardian_id, document_id
        FROM authorization_submission
        WHERE id = ${submissionId}::uuid
        FOR UPDATE
      `;
      if (!submission) throw new Error('No encontramos el envío de autorización.');
      if (submission.document_id) return submission.document_id;
      const stored = await this.storage.store(placeholderPng, 'image/png');
      try {
        const document = await transaction.document.create({ data: {
          ownerId: submission.guardian_id, type: 'GUARDIAN_IDENTITY', ...stored, isSimulated: true,
          deleteAfter: new Date(Date.now() + this.retentionDays * 86_400_000),
        } });
        await transaction.authorizationSubmission.update({ where: { id: submission.id }, data: { documentId: document.id } });
        return document.id;
      } catch (error) {
        await this.storage.delete(stored.privatePath);
        throw error;
      }
    });
  }
}
