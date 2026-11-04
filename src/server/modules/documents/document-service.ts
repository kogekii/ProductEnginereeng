import type { DocumentStorage, StoredDocument } from './document-storage.js';
import type { DocumentRepository } from './document-repository.js';

export class DocumentService {
  constructor(private readonly repository: DocumentRepository, private readonly storage: DocumentStorage, private readonly retentionDays: number, private readonly clock: () => Date = () => new Date()) {}

  async upload(ownerId: string, buffer: Buffer, mimeType: string, type: 'GUARDIAN_IDENTITY' | 'EXTERNAL_IDENTITY' = 'GUARDIAN_IDENTITY', predecessorDocumentId?: string): Promise<{ id: string }> {
    if (!this.matchesMime(buffer, mimeType)) throw new Error('El contenido del archivo no coincide con su tipo.');
    const stored: StoredDocument = await this.storage.store(buffer, mimeType);
    try {
      return await this.repository.create({
        ownerId, type, ...stored,
        deleteAfter: new Date(this.clock().getTime() + this.retentionDays * 86_400_000),
        ...(predecessorDocumentId ? { predecessorDocumentId } : {}),
      });
    } catch (error) {
      await this.storage.delete(stored.privatePath);
      throw error;
    }
  }

  async read(documentId: string, user: { id: string; isAdmin: boolean }) {
    const document = await this.repository.read(documentId, user, this.clock());
    if (!document) return null;
    return { buffer: await this.storage.read(document.privatePath), mimeType: document.mimeType };
  }

  private matchesMime(buffer: Buffer, mimeType: string) {
    if (mimeType === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    return false;
  }
}
