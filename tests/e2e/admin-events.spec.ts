import { expect, test } from '@playwright/test';

test('administrador filtra eventos por curso y revisa estudiantes pendientes', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Administrador: admin@colegio\.example/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL('/admin/eventos');
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Salida pedagógica' })).toBeVisible();

  await page.getByLabel('2° básico A').check();
  await expect(page.getByRole('heading', { name: 'Jornada deportiva' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Salida pedagógica' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Limpiar filtro' }).click();

  await page.getByRole('link', { name: 'Salida pedagógica' }).click();
  await expect(page.getByRole('heading', { name: 'Salida pedagógica' })).toBeVisible();
  await expect(page.getByText('Antonia Ejemplo Demo')).toBeVisible();
  await expect(page.getByText('Benjamín Ejemplo Demo')).toBeVisible();
  await expect(page.getByText(/apoderado2@colegio\.example/)).toHaveCount(2);
  await expect(page.getByText(/DEMO-/)).toHaveCount(0);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL('/login');
  expect((await page.context().cookies()).some(({ name }) => name === 'session')).toBe(false);
  expect((await page.request.get('/api/admin/events')).status()).toBe(401);
  await page.goto('/admin/eventos');
  await expect(page).toHaveURL('/login');
});
