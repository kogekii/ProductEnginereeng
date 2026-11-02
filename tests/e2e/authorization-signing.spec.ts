import { rm } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';

test('apoderado selecciona, revisa el resumen y confirma una autorización', async ({ page }) => {
  const prisma = new PrismaClient();
  let submissionId: string | undefined;
  try {
    await page.goto('/login');
    await page.getByRole('button', { name: /Apoderado: apoderado3@colegio\.example/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page).toHaveURL('/');
    await page.goto('/autorizaciones');
    await expect(page.getByRole('heading', { name: 'Jornada deportiva' })).toBeVisible();
    await page.getByLabel('Vicente Ejemplo Demo').check();
    await page.getByRole('button', { name: 'Continuar al resumen' }).click();
    await expect(page.getByRole('heading', { name: 'Revisa antes de firmar' })).toBeVisible();
    await expect(page.getByText('Vicente Ejemplo Demo')).toBeVisible();
    await expect(page.getByText('Documento simulado en modo demostración')).toBeVisible();
    await page.getByRole('link', { name: 'Volver a la selección' }).click();
    await expect(page.getByLabel('Vicente Ejemplo Demo')).toBeChecked();
    await page.getByRole('button', { name: 'Continuar al resumen' }).click();
    const resultResponse = page.waitForResponse((response) => response.url().includes('/api/guardian/authorizations/submissions') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Confirmar autorización' }).click();
    const response = await resultResponse;
    expect(response.status()).toBe(200);
    submissionId = (await response.json() as { submissionId: string }).submissionId;
    await expect(page.getByRole('heading', { name: 'Autorización enviada con éxito' })).toBeVisible();
  } finally {
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
