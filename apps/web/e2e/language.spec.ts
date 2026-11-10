import { expect, test } from '@playwright/test';

test('switches between Spanish and English and remembers the choice in the URL', async ({
  page,
}) => {
  await page.route('**/glyphs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/x-protobuf', body: '' }),
  );

  await page.goto('/?vista=64.5651,2.93883,12');
  await expect(page).toHaveURL(/\/es\?/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('link', { name: 'Fuentes y licencias' })).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\?/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Sources and licences' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Well map' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/en\?/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'Sources and licences' })).toBeVisible();

  await page.goto('/en/aviso-legal');
  await expect(page.getByRole('heading', { level: 1, name: 'Legal notice' })).toBeVisible();
  await expect(page.getByText('Luis Angel Gutierrez').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Luis Angel Gutierrez’s website' })).toHaveAttribute(
    'href',
    'https://luisangelgutierrez.com',
  );

  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page).toHaveURL(/\/es\/aviso-legal$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1, name: 'Aviso legal' })).toBeVisible();
});
