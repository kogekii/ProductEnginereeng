import { rm } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

const eventId = '40000000-0000-4000-8000-000000000001';

test('el resultado informa si el evento deja de permitir firmas después del resumen', async ({ page }) => {
  const prisma = new PrismaClient();
  let submissionId: string | undefined;
  try {
    await page.goto('/login');
    await page.getByRole('button', { name: /Apoderado: apoderado2@colegio\.example/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Hola, Diego' })).toBeVisible();
    await page.goto('/autorizaciones');
    await expect(page.getByRole('heading', { name: 'Salida pedagógica' })).toBeVisible();
    await page.getByLabel('Benjamín Ejemplo Demo').check();
    await page.getByRole('button', { name: 'Continuar al resumen' }).click();
    await expect(page.getByRole('heading', { name: 'Revisa antes de firmar' })).toBeVisible();
    await page.route('**/api/guardian/authorizations/submissions', async (route) => {
      await prisma.event.update({ where: { id: eventId }, data: { status: 'CLOSED' } });
      await route.continue();
    });
    await page.getByRole('button', { name: 'Confirmar autorización' }).click();
    await expect(page.getByRole('heading', { name: 'No se pudieron enviar las autorizaciones' })).toBeVisible();
    await expect(page.getByText('Este evento ya no permite firmar.')).toBeVisible();
    submissionId = await page.evaluate(() => {
      const value = JSON.parse(sessionStorage.getItem('authorization-result-v1') ?? 'null') as { submissionId?: string } | null;
      return value?.submissionId;
    });
  } finally {
    await prisma.event.update({ where: { id: eventId }, data: { status: 'PUBLISHED' } });
    if (submissionId) {
      const submission = await prisma.authorizationSubmission.findUnique({ where: { id: submissionId }, select: { documentId: true } });
      await prisma.authorization.deleteMany({ where: { submissionId } });
      if (submission?.documentId) {
        const document = await prisma.document.findUnique({ where: { id: submission.documentId }, select: { privatePath: true } });
        if (document) await rm(document.privatePath, { force: true });
      }
      await prisma.authorizationSubmission.deleteMany({ where: { id: submissionId } });
      if (submission?.documentId) await prisma.document.deleteMany({ where: { id: submission.documentId } });
    }
    await prisma.$disconnect();
  }
});
