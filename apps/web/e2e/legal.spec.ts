import { expect, test } from '@playwright/test';

const LEGAL_PAGES = [
  { link: 'Aviso legal', path: '/aviso-legal', heading: 'Aviso legal', text: 'Titular' },
  { link: 'Privacidad', path: '/privacidad', heading: 'Privacidad', text: 'Datos que se tratan' },
  { link: 'Datos', path: '/datos', heading: 'Datos', text: 'Datos de pozos' },
  { link: 'Cookies', path: '/cookies', heading: 'Cookies', text: 'Cookies que usamos' },
] as const;

test('opens the legal pages from the footer', async ({ page }) => {
  await page.goto('/aviso-legal');

  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('navigation', { name: 'Información legal' })).toBeVisible();

  for (const item of LEGAL_PAGES) {
    await footer.getByRole('link', { name: item.link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${item.path}$`));
    await expect(page.getByRole('heading', { level: 1, name: item.heading })).toBeVisible();
    await expect(page.getByText(item.text, { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Última actualización')).toBeVisible();
  }

  await expect(page.getByRole('link', { name: 'Volver al mapa' })).toBeVisible();
});
