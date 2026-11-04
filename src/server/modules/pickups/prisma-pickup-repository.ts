import { Prisma, PrismaClient, type PickupRequestStatus } from '@prisma/client';
import { isEligiblePickupDate, pickupCalendarWindow } from '../../../shared/dates.js';
import { normalizeExternalDocument } from '../../../shared/pickup.js';
import type { AdminPickupListQuery, PickupListQuery, PickupStatus, PickupSubmissionInput } from './pickup-types.js';
import { PickupServiceError, pickupPayloadHash, type PickupRepository, type PickupRequestContext, type PickupReviewContext } from './pickup-service.js';
import type { DocumentStorage } from '../documents/document-storage.js';

const requestDetails = {
  externalPerson: { select: { id: true, firstName: true, lastName: true, documentType: true, documentNumber: true, relationship: true, documentId: true } },
  items: {
    orderBy: [{ pickupDate: 'asc' as const }, { studentId: 'asc' as const }],
    include: { student: { include: { course: { select: { name: true } } } } },
  },
};

function fullName(student: { firstName: string; paternalSurname: string; maternalSurname: string | null }) {
  return [student.firstName, student.paternalSurname, student.maternalSurname].filter(Boolean).join(' ');
}

function dayString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function serializeRequest<T extends {
  id: string; status: PickupRequestStatus; submittedAt: Date; reviewedAt: Date | null; rejectionReason: string | null;
  externalPerson?: { firstName: string; lastName: string; documentType: string; documentNumber: string; relationship: string; documentId: string } | null;
  items?: Array<{ id: string; pickupDate: Date; student: { id: string; firstName: string; paternalSurname: string; maternalSurname: string | null; course: { name: string } } }>;
}>(row: T) {
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason,
    externalPerson: row.externalPerson ? {
      firstName: row.externalPerson.firstName,
      lastName: row.externalPerson.lastName,
      documentType: row.externalPerson.documentType,
      documentNumber: row.externalPerson.documentNumber,
      relationship: row.externalPerson.relationship,
      documentId: row.externalPerson.documentId,
    } : null,
    days: row.items ? row.items.reduce<Array<{ date: string; students: Array<{ id: string; fullName: string; courseName: string }> }>>((days, item) => {
      const date = dayString(item.pickupDate);
      let day = days.find((candidate) => candidate.date === date);
      if (!day) {
        day = { date, students: [] };
        days.push(day);
      }
      day.students.push({ id: item.student.id, fullName: fullName(item.student), courseName: item.student.course.name });
      return days;
    }, []) : undefined,
  };
}

function prismaCode(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code === 'P2010' && error.meta?.code === '40001') return 'P2034';
  return error.code;
}

export class PrismaPickupRepository implements PickupRepository {
  constructor(private readonly database: PrismaClient, private readonly storage: Pick<DocumentStorage, 'exists'>) {}

  async context(guardianId: string, now: Date) {
    const links = await this.database.guardianStudent.findMany({
      where: { guardianId, student: { isActive: true } },
      orderBy: [{ student: { firstName: 'asc' } }, { student: { paternalSurname: 'asc' } }],
      select: {
        studentId: true,
        student: { select: { firstName: true, paternalSurname: true, maternalSurname: true, course: { select: { name: true } } } },
      },
    });
    const { today, currentMonth, nextMonth } = pickupCalendarWindow(now);
    const [year, month] = nextMonth.split('-').map(Number);
    const lastDate = new Date(Date.UTC(year!, month!, 0));
    const candidate = new Date(`${today}T00:00:00.000Z`);
    const eligibleDates: string[] = [];
    while (candidate <= lastDate) {
      const value = dayString(candidate);
      if (isEligiblePickupDate(value, now)) eligibleDates.push(value);
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return {
      today,
      currentMonth,
      nextMonth,
      eligibleDates,
      students: links.map(({ studentId, student }) => ({ id: studentId, fullName: fullName(student), courseName: student.course.name })),
    };
  }

  async submit(input: PickupSubmissionInput, context: PickupRequestContext, now: Date) {
    const payloadHash = pickupPayloadHash(input);
    const canonicalExternal = {
      ...input.externalPerson,
      documentNumber: normalizeExternalDocument(input.externalPerson.documentType, input.externalPerson.documentNumber),
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.database.$transaction(async (transaction) => {
          const prior = await transaction.pickupRequest.findUnique({
            where: { guardianId_idempotencyKey: { guardianId: context.guardianId, idempotencyKey: input.idempotencyKey } },
            select: { id: true, status: true, payloadHash: true },
          });
          if (prior) {
            if (prior.payloadHash !== payloadHash) throw new PickupServiceError('IDEMPOTENCY_CONFLICT', 'La clave de envío ya se usó con otros datos.');
            return { pickupRequestId: prior.id, status: prior.status, replayed: true };
          }

          const invalidDates = input.days.filter(({ date }) => !isEligiblePickupDate(date, now)).map(({ date }) => date);
          if (invalidDates.length) {
            throw new PickupServiceError('PICKUP_DATES_EXPIRED', 'Una o más fechas ya no están disponibles. Actualiza los días seleccionados.', { dates: invalidDates });
          }

          const studentIds = [...new Set(input.days.flatMap(({ studentIds: ids }) => ids))];
          const links = await transaction.guardianStudent.findMany({
            where: { guardianId: context.guardianId, studentId: { in: studentIds }, student: { isActive: true } },
            select: { studentId: true, student: { select: { firstName: true, paternalSurname: true, maternalSurname: true, course: { select: { name: true } } } } },
          });
          if (links.length !== studentIds.length) {
            throw new PickupServiceError('INVALID_SELECTION', 'La selección contiene estudiantes que no están vinculados a tu cuenta o ya no están activos.');
          }
          const studentById = new Map(links.map((link) => [link.studentId, link.student]));

          const documentIds = [input.guardianDocumentId, canonicalExternal.documentId].sort();
          for (const documentId of documentIds) {
            const claimed = await transaction.$executeRaw`UPDATE document SET claim_version = claim_version + 1 WHERE id = ${documentId}::uuid`;
            if (claimed !== 1) throw new PickupServiceError('INVALID_DOCUMENT', 'Uno de los documentos no está disponible para esta solicitud. Vuelve a adjuntarlo.');
          }
          const documents = await transaction.document.findMany({
            where: { id: { in: documentIds } },
            select: {
              id: true, ownerId: true, type: true, deletedAt: true, deleteAfter: true, predecessorDocumentId: true,
              submissions: { select: { id: true }, take: 1 }, authorizations: { select: { id: true }, take: 1 },
              pickupGuardianRequest: { select: { id: true } }, externalPerson: { select: { id: true } },
            },
          });
          const guardianDocument = documents.find(({ id }) => id === input.guardianDocumentId);
          const externalDocument = documents.find(({ id }) => id === canonicalExternal.documentId);
          if (!guardianDocument || !externalDocument
            || guardianDocument.id === externalDocument.id
            || guardianDocument.ownerId !== context.guardianId
            || externalDocument.ownerId !== context.guardianId
            || guardianDocument.type !== 'GUARDIAN_IDENTITY'
            || externalDocument.type !== 'EXTERNAL_IDENTITY'
            || guardianDocument.predecessorDocumentId !== null
            || externalDocument.predecessorDocumentId !== guardianDocument.id
            || guardianDocument.deletedAt || externalDocument.deletedAt
            || guardianDocument.deleteAfter <= now || externalDocument.deleteAfter <= now
            || guardianDocument.submissions.length || externalDocument.submissions.length
            || guardianDocument.authorizations.length || externalDocument.authorizations.length
            || guardianDocument.pickupGuardianRequest || externalDocument.pickupGuardianRequest
            || guardianDocument.externalPerson || externalDocument.externalPerson) {
            throw new PickupServiceError('INVALID_DOCUMENT', 'Uno de los documentos no está disponible para esta solicitud. Vuelve a adjuntarlo.');
          }

          const pairs = input.days.flatMap(({ date, studentIds: ids }) => ids.map((studentId) => ({
            date,
            studentId,
            student: studentById.get(studentId)!,
            pickupDate: new Date(`${date}T00:00:00.000Z`),
          })));
          const conflicts = await transaction.pickupActiveSlot.findMany({
            where: { OR: pairs.map(({ pickupDate, studentId }) => ({ pickupDate, studentId })) },
            select: { studentId: true, pickupDate: true },
          });
          if (conflicts.length) {
            const conflictKeys = new Set(conflicts.map(({ studentId, pickupDate }) => `${studentId}:${dayString(pickupDate)}`));
            throw new PickupServiceError('PICKUP_CONFLICT', 'Ya existe un retiro activo para alguna de esas fechas. Revisa las fechas indicadas.', {
              conflicts: pairs.filter(({ studentId, date }) => conflictKeys.has(`${studentId}:${date}`)).map(({ studentId, date, student }) => ({ studentId, date, studentName: fullName(student) })),
            });
          }

          const externalName = `${canonicalExternal.firstName} ${canonicalExternal.lastName}`.trim();
          const summarySnapshot = {
            days: pairs.map(({ studentId, date, student }) => ({
              date,
              studentId,
              studentName: fullName(student),
              courseName: student.course.name,
            })),
            externalPerson: {
              firstName: canonicalExternal.firstName,
              lastName: canonicalExternal.lastName,
              documentType: canonicalExternal.documentType,
              documentNumber: canonicalExternal.documentNumber,
              relationship: canonicalExternal.relationship,
            },
            purpose: `Autoriza a ${externalName} para retirar a los estudiantes indicados en las fechas seleccionadas.`,
          };
          const request = await transaction.pickupRequest.create({
            data: {
              guardianId: context.guardianId,
              guardianDocumentId: input.guardianDocumentId,
              idempotencyKey: input.idempotencyKey,
              payloadHash,
              summarySnapshot,
              sessionId: context.sessionId,
              ip: context.ip,
              userAgent: context.userAgent,
              externalPerson: { create: {
                firstName: canonicalExternal.firstName,
                lastName: canonicalExternal.lastName,
                documentType: canonicalExternal.documentType,
                documentNumber: canonicalExternal.documentNumber,
                relationship: canonicalExternal.relationship,
                documentId: canonicalExternal.documentId,
              } },
              items: { create: pairs.map(({ studentId, pickupDate }) => ({ studentId, pickupDate })) },
            },
            select: { id: true, status: true, items: { select: { id: true, studentId: true, pickupDate: true } } },
          });
          await transaction.pickupActiveSlot.createMany({
            data: request.items.map((item) => ({ itemId: item.id, requestId: request.id, studentId: item.studentId, pickupDate: item.pickupDate })),
          });
          await transaction.auditLog.create({ data: {
            actorId: context.guardianId,
            action: 'PICKUP_SUBMITTED',
            entity: 'PICKUP_REQUEST',
            entityId: request.id,
            metadata: { dayCount: input.days.length, pairCount: pairs.length },
            ip: context.ip,
            userAgent: context.userAgent,
          } });
          return { pickupRequestId: request.id, status: request.status, replayed: false };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
      } catch (error) {
        if (error instanceof PickupServiceError) throw error;
        const code = prismaCode(error);
        if (code === 'P2034' && attempt < 2) continue;
        if (code === 'P2034') throw new PickupServiceError('RETRYABLE_ERROR', 'No fue posible completar el envío por una actualización simultánea. Intenta nuevamente.');
        if (code === 'P2002') {
          const prior = await this.database.pickupRequest.findUnique({
            where: { guardianId_idempotencyKey: { guardianId: context.guardianId, idempotencyKey: input.idempotencyKey } },
            select: { id: true, status: true, payloadHash: true },
          });
          if (prior) {
            if (prior.payloadHash !== payloadHash) throw new PickupServiceError('IDEMPOTENCY_CONFLICT', 'La clave de envío ya se usó con otros datos.');
            return { pickupRequestId: prior.id, status: prior.status, replayed: true };
          }
          const conflicts = await this.database.pickupActiveSlot.findMany({
            where: { OR: input.days.flatMap(({ date, studentIds }) => studentIds.map((studentId) => ({ studentId, pickupDate: new Date(`${date}T00:00:00.000Z`) }))) },
            select: { studentId: true, pickupDate: true },
          });
          if (conflicts.length) {
            const keys = new Set(conflicts.map(({ studentId, pickupDate }) => `${studentId}:${dayString(pickupDate)}`));
            const linkedStudents = await this.database.student.findMany({ where: { id: { in: conflicts.map(({ studentId }) => studentId) } }, select: { id: true, firstName: true, paternalSurname: true, maternalSurname: true } });
            const names = new Map(linkedStudents.map((student) => [student.id, fullName(student)]));
            throw new PickupServiceError('PICKUP_CONFLICT', 'Ya existe un retiro activo para alguna de esas fechas. Revisa las fechas indicadas.', {
              conflicts: input.days.flatMap(({ date, studentIds }) => studentIds.filter((studentId) => keys.has(`${studentId}:${date}`)).map((studentId) => ({ studentId, date, studentName: names.get(studentId) ?? '' }))),
            });
          }
        }
        throw error;
      }
    }
    throw new PickupServiceError('RETRYABLE_ERROR', 'No fue posible completar el envío. Intenta nuevamente.');
  }

  async listForGuardian(guardianId: string, query: PickupListQuery) {
    const where = { guardianId };
    const [rows, total] = await Promise.all([
      this.database.pickupRequest.findMany({ where, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: requestDetails }),
      this.database.pickupRequest.count({ where }),
    ]);
    return { items: rows.map(serializeRequest), page: query.page, pageSize: query.pageSize, total };
  }

  async getForGuardian(guardianId: string, id: string) {
    const row = await this.database.pickupRequest.findFirst({ where: { id, guardianId }, include: requestDetails });
    return row ? serializeRequest(row) : null;
  }

  async listForAdmin(query: AdminPickupListQuery) {
    const where: Prisma.PickupRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.date ? { items: { some: { pickupDate: new Date(`${query.date}T00:00:00.000Z`) } } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.database.pickupRequest.findMany({
        where,
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { ...requestDetails, guardian: { select: { firstName: true, paternalSurname: true, maternalSurname: true, email: true, phoneE164: true } } },
      }),
      this.database.pickupRequest.count({ where }),
    ]);
    return {
      items: rows.map((row) => {
        const serialized = serializeRequest(row);
        return {
          ...serialized,
          matchedDays: query.date ? serialized.days?.filter(({ date }) => date === query.date) ?? [] : serialized.days,
          dayCount: serialized.days?.length ?? 0,
          guardian: { fullName: fullName(row.guardian), email: row.guardian.email, phone: row.guardian.phoneE164 },
        };
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getForAdmin(id: string) {
    const row = await this.database.pickupRequest.findUnique({ where: { id }, include: {
      ...requestDetails,
      guardian: { select: { id: true, firstName: true, paternalSurname: true, maternalSurname: true, email: true, phoneE164: true } },
      guardianDocument: { select: { id: true, privatePath: true, deletedAt: true, deleteAfter: true } },
      externalPerson: { include: { document: { select: { id: true, privatePath: true, deletedAt: true, deleteAfter: true } } } },
      reviewedBy: { select: { id: true, firstName: true, paternalSurname: true, maternalSurname: true } },
    } });
    if (!row) return null;
    const [guardianFileExists, externalFileExists] = await Promise.all([
      row.guardianDocument.deletedAt === null && row.guardianDocument.deleteAfter > new Date() ? this.storage.exists(row.guardianDocument.privatePath) : false,
      row.externalPerson && row.externalPerson.document.deletedAt === null && row.externalPerson.document.deleteAfter > new Date()
        ? this.storage.exists(row.externalPerson.document.privatePath) : Promise.resolve(false),
    ]);
    return {
      ...serializeRequest(row),
      guardian: { id: row.guardian.id, fullName: fullName(row.guardian), email: row.guardian.email, phone: row.guardian.phoneE164 },
      documents: {
        guardian: { id: row.guardianDocument.id, available: guardianFileExists },
        external: { id: row.externalPerson?.document.id ?? null, available: externalFileExists },
      },
      reviewedBy: row.reviewedBy ? { id: row.reviewedBy.id, fullName: fullName(row.reviewedBy) } : null,
    };
  }

  async review(id: string, context: PickupReviewContext, now: Date) {
    if (context.decision === 'REJECT' && !context.reason?.trim()) {
      throw new PickupServiceError('INVALID_SELECTION', 'Ingresa el motivo del rechazo.');
    }
    if (context.decision === 'APPROVE') {
      const files = await this.database.pickupRequest.findUnique({
        where: { id },
        select: { guardianDocument: { select: { privatePath: true, deletedAt: true, deleteAfter: true } }, externalPerson: { select: { document: { select: { privatePath: true, deletedAt: true, deleteAfter: true } } } } },
      });
      if (!files || files.guardianDocument.deletedAt || files.guardianDocument.deleteAfter <= now || !files.externalPerson
        || files.externalPerson.document.deletedAt || files.externalPerson.document.deleteAfter <= now) {
        throw new PickupServiceError('DOCUMENT_UNAVAILABLE', 'No se puede aprobar la solicitud porque falta un documento vigente.');
      }
      const [guardianAvailable, externalAvailable] = await Promise.all([
        this.storage.exists(files.guardianDocument.privatePath),
        this.storage.exists(files.externalPerson.document.privatePath),
      ]);
      if (!guardianAvailable || !externalAvailable) throw new PickupServiceError('DOCUMENT_UNAVAILABLE', 'No se puede aprobar la solicitud porque falta un documento disponible.');
    }
    try {
      return await this.database.$transaction(async (transaction) => {
      const [locked] = await transaction.$queryRaw<Array<{ id: string }>>`SELECT id FROM pickup_request WHERE id = ${id}::uuid FOR UPDATE`;
      if (!locked) throw new PickupServiceError('PICKUP_NOT_FOUND', 'No encontramos la solicitud de retiro.');
      const request = await transaction.pickupRequest.findUnique({
        where: { id },
        include: { items: { select: { pickupDate: true } }, guardianDocument: { select: { deletedAt: true, deleteAfter: true } }, externalPerson: { include: { document: { select: { deletedAt: true, deleteAfter: true } } } } },
      });
      if (!request) throw new PickupServiceError('PICKUP_NOT_FOUND', 'No encontramos la solicitud de retiro.');
      if (request.status !== 'PENDING_REVIEW') throw new PickupServiceError('REVIEW_CONFLICT', 'La solicitud ya fue revisada. Actualiza la información para ver el estado actual.');
      if (context.decision === 'APPROVE') {
        const today = (await import('../../../shared/dates.js')).dateInSantiago(now);
        if (request.items.some(({ pickupDate }) => dayString(pickupDate) < today)) {
          throw new PickupServiceError('PICKUP_DATES_EXPIRED', 'No se puede aprobar el lote porque incluye una fecha que ya pasó.');
        }
        if (request.guardianDocument.deletedAt || request.guardianDocument.deleteAfter <= now
          || !request.externalPerson || request.externalPerson.document.deletedAt || request.externalPerson.document.deleteAfter <= now) {
          throw new PickupServiceError('DOCUMENT_UNAVAILABLE', 'No se puede aprobar la solicitud porque falta un documento vigente.');
        }
      }

      const status: PickupStatus = context.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const updated = await transaction.pickupRequest.updateMany({
        where: { id, status: 'PENDING_REVIEW' },
        data: { status, reviewedById: context.adminId, reviewedAt: now, rejectionReason: status === 'REJECTED' ? context.reason!.trim() : null },
      });
      if (updated.count !== 1) throw new PickupServiceError('REVIEW_CONFLICT', 'La solicitud ya fue revisada. Actualiza la información para ver el estado actual.');
      if (status === 'REJECTED') await transaction.pickupActiveSlot.deleteMany({ where: { requestId: id } });
      await transaction.auditLog.create({ data: {
        actorId: context.adminId,
        action: status === 'APPROVED' ? 'PICKUP_APPROVED' : 'PICKUP_REJECTED',
        entity: 'PICKUP_REQUEST',
        entityId: id,
        metadata: { pairCount: request.items.length },
        ip: context.ip,
        userAgent: context.userAgent,
      } });
      return { pickupRequestId: id, status };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 });
    } catch (error) {
      const code = prismaCode(error);
      if (code === 'P2034') throw new PickupServiceError('REVIEW_CONFLICT', 'La solicitud fue revisada por otra persona. Actualiza la información para ver el estado actual.');
      throw error;
    }
  }
}
