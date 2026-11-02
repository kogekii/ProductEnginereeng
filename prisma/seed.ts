import 'dotenv/config';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

if (process.env.DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production') {
  throw new Error('La carga de datos de demostración requiere DEMO_MODE=true fuera de producción.');
}

const prisma = new PrismaClient();
const id = {
  admin: '10000000-0000-4000-8000-000000000001',
  guardians: ['10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004'],
  courses: ['20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000004'],
  students: Array.from({ length: 10 }, (_, index) => `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`),
  events: ['40000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000005'],
  session: '50000000-0000-4000-8000-000000000001',
  document: '60000000-0000-4000-8000-000000000001',
  submission: '70000000-0000-4000-8000-000000000001',
  authorizations: ['80000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000002'],
};

async function seed() {
  const users = [
    { id: id.admin, email: 'admin@colegio.example', phoneE164: '+56900000001', firstName: 'Administración', paternalSurname: 'Colegio', isAdmin: true },
    { id: id.guardians[0]!, email: 'apoderado1@colegio.example', phoneE164: '+56900000002', firstName: 'Camila', paternalSurname: 'Ejemplo', isAdmin: false },
    { id: id.guardians[1]!, email: 'apoderado2@colegio.example', phoneE164: '+56900000003', firstName: 'Diego', paternalSurname: 'Ejemplo', isAdmin: false },
    { id: id.guardians[2]!, email: 'apoderado3@colegio.example', phoneE164: '+56900000004', firstName: 'Francisca', paternalSurname: 'Ejemplo', isAdmin: false },
  ];
  for (const user of users) await prisma.user.upsert({ where: { id: user.id }, create: user, update: user });

  const courseNames = ['1° básico A', '2° básico A', '3° básico A', '4° básico A'];
  for (let index = 0; index < id.courses.length; index++) {
    const courseId = id.courses[index]!;
    const course = { id: courseId, name: courseNames[index]!, level: `${index + 1}° básico`, year: 2026 };
    await prisma.course.upsert({ where: { id: courseId }, create: course, update: course });
  }

  for (let index = 0; index < id.students.length; index++) {
    const studentId = id.students[index]!;
    const student = {
      id: studentId, documentType: 'RUN', documentNumber: `DEMO-${String(index + 1).padStart(3, '0')}`,
      firstName: ['Martina', 'Tomás', 'Sofía', 'Benjamín', 'Antonia', 'Vicente', 'Emilia', 'Joaquín', 'Isidora', 'Gaspar'][index]!,
      paternalSurname: 'Ejemplo', maternalSurname: 'Demo', courseId: id.courses[index % id.courses.length]!,
    };
    await prisma.student.upsert({ where: { id: studentId }, create: student, update: student });
  }

  const links = [
    [id.guardians[0]!, id.students[0]!], [id.guardians[0]!, id.students[1]!], [id.guardians[0]!, id.students[2]!],
    [id.guardians[1]!, id.students[2]!], [id.guardians[1]!, id.students[3]!], [id.guardians[1]!, id.students[4]!],
    [id.guardians[2]!, id.students[5]!], [id.guardians[2]!, id.students[6]!], [id.guardians[2]!, id.students[7]!], [id.guardians[2]!, id.students[8]!], [id.guardians[2]!, id.students[9]!],
  ];
  for (const [index, [guardianId, studentId]] of links.entries()) {
    await prisma.guardianStudent.upsert({
      where: { guardianId_studentId: { guardianId: guardianId!, studentId: studentId! } },
      create: { guardianId: guardianId!, studentId: studentId!, relationship: 'Apoderado', isPrimary: index % 2 === 0 },
      update: { relationship: 'Apoderado', isPrimary: index % 2 === 0 },
    });
  }

  const starts = [10, 35, 45, 60, 75].map((days) => new Date(Date.now() + days * 86_400_000));
  const statuses = ['PUBLISHED', 'PUBLISHED', 'CLOSED', 'DRAFT', 'CANCELLED'] as const;
  const titles = ['Salida pedagógica', 'Jornada deportiva', 'Vacunación escolar', 'Actividad en preparación', 'Evento cancelado'];
  for (let index = 0; index < id.events.length; index++) {
    const eventId = id.events[index]!;
    const start = starts[index]!;
    await prisma.event.upsert({
      where: { id: eventId },
      create: {
        id: eventId, type: index === 2 ? 'VACCINATION' : 'TRIP', title: titles[index]!,
        description: 'Actividad de demostración para revisar el flujo de autorizaciones.',
        location: 'Santiago', startsAt: start, endsAt: new Date(start.getTime() + 3_600_000),
        authorizationText: 'Autorizo la participación de mi estudiante en esta actividad.',
        deadlineAt: new Date(start.getTime() - 2 * 86_400_000), status: statuses[index]!, createdById: id.admin,
      },
      update: { title: titles[index]!, startsAt: start, endsAt: new Date(start.getTime() + 3_600_000), deadlineAt: new Date(start.getTime() - 2 * 86_400_000), status: statuses[index]! },
    });
    const courseId = id.courses[index % id.courses.length]!;
    await prisma.eventCourse.upsert({ where: { eventId_courseId: { eventId, courseId } }, create: { eventId, courseId }, update: {} });
  }

  const exceptions = [
    { eventId: id.events[0]!, studentId: id.students[3]!, mode: 'INCLUDE' as const },
    { eventId: id.events[0]!, studentId: id.students[0]!, mode: 'EXCLUDE' as const },
  ];
  for (const exception of exceptions) {
    await prisma.eventStudentException.upsert({ where: { eventId_studentId: { eventId: exception.eventId, studentId: exception.studentId } }, create: exception, update: { mode: exception.mode } });
  }

  const tokenHash = createHash('sha256').update('demo-seed-session-token-never-used').digest('hex');
  await prisma.session.upsert({ where: { id: id.session }, create: { id: id.session, userId: id.guardians[0]!, tokenHash, expiresAt: new Date(Date.now() + 7 * 86_400_000) }, update: { expiresAt: new Date(Date.now() + 7 * 86_400_000), revokedAt: null } });
  await prisma.document.upsert({ where: { id: id.document }, create: {
    id: id.document, ownerId: id.guardians[0]!, type: 'GUARDIAN_IDENTITY', privatePath: 'demo/private-placeholder.png', mimeType: 'image/png',
    sizeBytes: 68, sha256: createHash('sha256').update('demo-private-placeholder').digest('hex'), isSimulated: true,
    deleteAfter: new Date(Date.now() + 365 * 86_400_000),
  }, update: { isSimulated: true, deleteAfter: new Date(Date.now() + 365 * 86_400_000) } });
  await prisma.authorizationSubmission.upsert({ where: { id: id.submission }, create: {
    id: id.submission, guardianId: id.guardians[0]!, documentId: id.document, idempotencyKey: '90000000-0000-4000-8000-000000000001',
    sessionId: id.session, status: 'PROCESSED', resultSnapshot: { createdCount: 1, failedCount: 0 },
  }, update: { documentId: id.document, sessionId: id.session, status: 'PROCESSED', resultSnapshot: { createdCount: 1, failedCount: 0 } } });

  const summary = (studentId: string) => ({ eventId: id.events[0], studentId, title: titles[0], startsAt: starts[0]!.toISOString(), purpose: 'Actividad de demostración', deadlineAt: new Date(starts[0]!.getTime() - 2 * 86_400_000).toISOString(), submissionCount: 2 });
  for (const [index, state] of ['SIGNED', 'ANNULLED'].entries()) {
    const studentId = id.students[index]!;
    await prisma.authorization.upsert({
      where: { id: id.authorizations[index]! },
      create: {
        id: id.authorizations[index]!, eventId: id.events[0]!, studentId, guardianId: id.guardians[0]!,
        submissionId: id.submission, documentId: id.document, sessionId: id.session, status: state,
        authorizationTextSnapshot: 'Autorizo la participación de mi estudiante en esta actividad.',
        authorizationTextHash: createHash('sha256').update('Autorizo la participación de mi estudiante en esta actividad.').digest('hex'),
        summarySnapshot: summary(studentId),
        ...(state === 'ANNULLED' ? { annulledAt: new Date(), annulledById: id.admin, annulmentReason: 'Registro de demostración' } : {}),
      },
      update: { status: state, ...(state === 'ANNULLED' ? { annulledAt: new Date(), annulledById: id.admin, annulmentReason: 'Registro de demostración' } : { annulledAt: null, annulledById: null, annulmentReason: null }) },
    });
  }
  console.info('Datos de demostración listos: admin@colegio.example, apoderado1@colegio.example, apoderado2@colegio.example, apoderado3@colegio.example');
}

seed().finally(async () => prisma.$disconnect());
