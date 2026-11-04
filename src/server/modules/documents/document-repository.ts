import { PrismaClient, type DocumentType } from '@prisma/client';

export interface NewDocumentRecord {
  ownerId: string;
  type: DocumentType;
  privatePath: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  deleteAfter: Date;
  predecessorDocumentId?: string;
}

export interface DocumentPrincipal { id: string; isAdmin: boolean }

export interface DocumentRepository {
  create(input: NewDocumentRecord): Promise<{ id: string }>;
  read(documentId: string, principal: DocumentPrincipal, now: Date): Promise<{ privatePath: string; mimeType: string } | null>;
}

export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly database: PrismaClient) {}

  async create(input: NewDocumentRecord) {
    if (input.type === 'EXTERNAL_IDENTITY') {
      if (!input.predecessorDocumentId) throw new Error('Adjunta primero el documento del apoderado.');
      return this.database.$transaction(async (transaction) => {
        const claimed = await transaction.$executeRaw`
          UPDATE document SET claim_version = claim_version + 1 WHERE id = ${input.predecessorDocumentId}::uuid
        `;
        if (claimed !== 1) throw new Error('El documento del apoderado no está disponible.');
        const available = await transaction.document.findFirst({
          where: {
            id: input.predecessorDocumentId,
            ownerId: input.ownerId,
            type: 'GUARDIAN_IDENTITY',
            deletedAt: null,
            deleteAfter: { gt: new Date() },
            predecessorDocumentId: null,
            submissions: { none: {} },
            pickupGuardianRequest: null,
            externalPerson: null,
            successorDocument: null,
          },
          select: { id: true },
        });
        if (!available) throw new Error('El documento del apoderado no te pertenece, venció o ya está asociado a otro envío.');
        return transaction.document.create({ data: input, select: { id: true } });
      });
    }
    return this.database.document.create({ data: input, select: { id: true } });
  }

  read(documentId: string, principal: DocumentPrincipal, now: Date) {
    return this.database.document.findFirst({
      where: {
        id: documentId,
        deletedAt: null,
        deleteAfter: { gt: now },
        ...(principal.isAdmin ? {} : {
          OR: [
            { ownerId: principal.id },
            { submissions: { some: { guardianId: principal.id } } },
            { pickupGuardianRequest: { is: { guardianId: principal.id } } },
            { externalPerson: { is: { request: { is: { guardianId: principal.id } } } } },
          ],
        }),
      },
      select: { privatePath: true, mimeType: true },
    });
  }

}
