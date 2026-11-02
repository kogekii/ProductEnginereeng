import { expect, test } from '@playwright/test';

test('el apoderado inicia sesión desde la cuenta de demostración', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Apoderado: apoderado1@colegio\.example/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Hola, Camila' })).toBeVisible();
});

test('una cuenta desconocida muestra un mensaje y no crea sesión', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico o teléfono').fill('no-existe@colegio.example');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('alert')).toHaveText('No encontramos una cuenta activa con esos datos.');
  await expect(page).toHaveURL('/login');
});
