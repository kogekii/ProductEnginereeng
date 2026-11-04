import 'dotenv/config';
import { expect, test } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { prisma } from '../../src/server/lib/prisma.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=', 'base64');
const createdRequests: string[] = [];

async function removeTestRequest(id: string) {
  const row = await prisma.pickupRequest.findUnique({
    where: { id },
    select: { guardianDocument: { select: { id: true, privatePath: true } }, externalPerson: { select: { document: { select: { id: true, privatePath: true } } } } },
  });
  if (!row) return;
  await prisma.pickupActiveSlot.deleteMany({ where: { requestId: id } });
  await prisma.pickupItem.deleteMany({ where: { requestId: id } });
  await prisma.externalPerson.deleteMany({ where: { requestId: id } });
  await prisma.auditLog.deleteMany({ where: { entity: 'PICKUP_REQUEST', entityId: id } });
  await prisma.pickupRequest.delete({ where: { id } });
  const externalDocument = row.externalPerson?.document;
  if (externalDocument) {
    await rm(externalDocument.privatePath, { force: true });
    await prisma.document.delete({ where: { id: externalDocument.id } });
  }
  await rm(row.guardianDocument.privatePath, { force: true });
  await prisma.document.delete({ where: { id: row.guardianDocument.id } });
}

test.beforeAll(async () => {
  const stale = await prisma.pickupRequest.findMany({ where: { externalPerson: { is: { lastName: { in: ['E2E', 'Rechazo E2E'] } } } }, select: { id: true } });
  for (const { id } of stale) await removeTestRequest(id);
});

test.afterEach(async () => {
  for (const id of createdRequests.splice(0)) await removeTestRequest(id);
});

async function signIn(page: import('@playwright/test').Page, account: 'apoderado1' | 'admin') {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(`${account === 'admin' ? 'Administrador' : 'Apoderado'}: ${account}@colegio\\.example`) }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(account === 'admin' ? '/admin/eventos' : '/');
}

test('apoderado envía un retiro de varios días y dirección lo aprueba', async ({ page, browser }, testInfo) => {
  if (testInfo.project.name === 'mobile-chromium') await page.setViewportSize({ width: 320, height: 844 });
  await signIn(page, 'apoderado1');
  await expect(page).toHaveURL('/');
  await page.getByRole('link', { name: /Retiro externo/ }).click();
  await expect(page).toHaveURL('/retiros');
  if (testInfo.project.name === 'mobile-chromium') expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const offset = testInfo.project.name === 'mobile-chromium' ? 3 : 0;
  await page.locator('.pickup-day:not(:disabled)').nth(offset).click();
  await page.getByRole('button', { name: 'Mostrar mes siguiente' }).click();
  await page.locator('.pickup-day:not(:disabled)').nth(offset).click();
  await page.getByRole('button', { name: 'Cambiar estudiantes por día' }).click();
  await page.locator('.pickup-day-fieldset').nth(1).locator('input[type="checkbox"]').nth(1).uncheck();
  await expect(page.getByText('Selección distinta').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByLabel('Nombres').fill('Persona');
  await page.getByLabel('Apellidos').fill('E2E');
  await page.getByLabel('RUT', { exact: true }).fill('12.345.678-5');
  await page.getByLabel('Parentesco o vínculo').fill('Familiar');
  await page.locator('#guardian-document-file').setInputFiles({ name: 'apoderado.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Documento del apoderado cargado')).toBeVisible();
  await page.locator('#external-document-file').setInputFiles({ name: 'externo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Documento del externo cargado')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa antes de enviar' })).toBeVisible();
  await expect(page.getByText(/El colegio revisará la solicitud/)).toBeVisible();
  await page.getByRole('link', { name: 'Volver a los datos' }).click();
  await expect(page.getByText('Documento del apoderado cargado')).toBeVisible();
  await expect(page.getByText('Documento del externo cargado')).toBeVisible();
  await page.getByLabel('Parentesco o vínculo').fill('Tío');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  await expect(page.getByText('Tío', { exact: true })).toBeVisible();

  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/guardian/pickups') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const { pickupRequestId } = await response.json() as { pickupRequestId: string };
  createdRequests.push(pickupRequestId);
  await expect(page).toHaveURL(`/retiros/solicitudes/${pickupRequestId}`);
  await expect(page.getByText('Pendiente de revisión', { exact: true })).toBeVisible();
  await expect(page.getByText(/el retiro aún no está autorizado/i).first()).toBeVisible();

  const adminContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' });
  const adminPage = await adminContext.newPage();
  if (testInfo.project.name === 'mobile-chromium') await adminPage.setViewportSize({ width: 320, height: 844 });
  await signIn(adminPage, 'admin');
  await adminPage.goto(`/admin/retiros/${pickupRequestId}`);
  await expect(adminPage.getByRole('heading', { name: 'Retiro externo' })).toBeVisible();
  if (testInfo.project.name === 'mobile-chromium') expect(await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(adminPage.getByText('Persona E2E', { exact: true })).toBeVisible();
  await expect(adminPage.getByRole('link', { name: 'Abrir documento' })).toHaveCount(2);
  const [download] = await Promise.all([
    adminPage.waitForEvent('download'),
    adminPage.getByRole('link', { name: 'Abrir documento' }).first().click(),
  ]);
  expect(download.suggestedFilename()).toBeTruthy();
  await adminPage.getByRole('button', { name: 'Aprobar lote completo' }).click();
  await expect(adminPage.getByText('Aprobada')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Aprobada')).toBeVisible();
  await page.getByRole('link', { name: 'Mis solicitudes' }).click();
  await expect(page.getByRole('heading', { name: 'Mis solicitudes' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Solicitud de retiro' })).toBeVisible();
  await adminContext.close();
});

test('dirección rechaza el lote con motivo y el apoderado lo consulta', async ({ page, browser }, testInfo) => {
  if (testInfo.project.name === 'mobile-chromium') await page.setViewportSize({ width: 320, height: 844 });
  await signIn(page, 'apoderado1');
  await page.getByRole('link', { name: /Retiro externo/ }).click();
  const offset = testInfo.project.name === 'mobile-chromium' ? 4 : 1;
  const selectedDay = page.locator('.pickup-day:not(:disabled)').nth(offset);
  const selectedDayLabel = await selectedDay.getAttribute('aria-label');
  await selectedDay.click();
  await expect(page.getByText('Todos tus estudiantes están incluidos en la selección común.')).toBeVisible();
  const defaultStudents = page.locator('.pickup-selected-day').first();
  await expect(defaultStudents).toContainText('Martina Ejemplo Demo');
  await expect(defaultStudents).toContainText('Tomás Ejemplo Demo');
  await expect(defaultStudents).toContainText('Sofía Ejemplo Demo');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nombres').fill('Persona');
  await page.getByLabel('Apellidos').fill('Rechazo E2E');
  await page.getByLabel('RUT', { exact: true }).fill('12.345.678-5');
  await page.getByLabel('Parentesco o vínculo').fill('Familiar');
  await page.locator('#guardian-document-file').setInputFiles({ name: 'apoderado.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Documento del apoderado cargado')).toBeVisible();
  await page.locator('#external-document-file').setInputFiles({ name: 'externo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Documento del externo cargado')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/guardian/pickups') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const { pickupRequestId } = await response.json() as { pickupRequestId: string };
  createdRequests.push(pickupRequestId);
  await expect(page).toHaveURL(`/retiros/solicitudes/${pickupRequestId}`);

  const adminContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' });
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, 'admin');
  await adminPage.goto(`/admin/retiros/${pickupRequestId}`);
  await adminPage.getByLabel('Motivo de rechazo').fill('El documento no se distingue.');
  await adminPage.getByRole('button', { name: 'Rechazar con motivo' }).click();
  await expect(adminPage.getByText('Rechazada')).toBeVisible();
  await page.reload();
  await expect(page.getByText('El documento no se distingue.')).toBeVisible();
  await page.goto('/retiros');
  await page.getByRole('button', { name: selectedDayLabel! }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nombres').fill('Persona');
  await page.getByLabel('Apellidos').fill('Corregido E2E');
  await page.getByLabel('RUT', { exact: true }).fill('12.345.678-5');
  await page.getByLabel('Parentesco o vínculo').fill('Familiar');
  await page.locator('#guardian-document-file').setInputFiles({ name: 'apoderado-corregido.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Documento del apoderado cargado')).toBeVisible();
  await page.locator('#external-document-file').setInputFiles({ name: 'externo-corregido.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Documento del externo cargado')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  const retryResponsePromise = page.waitForResponse((candidate) => candidate.url().endsWith('/api/guardian/pickups') && candidate.request().method() === 'POST');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  const retryResponse = await retryResponsePromise;
  expect(retryResponse.status()).toBe(201);
  const retryRequest = await retryResponse.json() as { pickupRequestId: string };
  createdRequests.push(retryRequest.pickupRequestId);
  expect(retryRequest.pickupRequestId).not.toBe(pickupRequestId);
  await expect(page).toHaveURL(`/retiros/solicitudes/${retryRequest.pickupRequestId}`);
  await expect(page.getByText('Pendiente de revisión', { exact: true })).toBeVisible();
  await adminContext.close();
});
