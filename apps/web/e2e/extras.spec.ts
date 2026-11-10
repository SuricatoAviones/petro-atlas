import { expect, test, type Page } from '@playwright/test';

const INITIAL_VIEW = '64.5651,2.93883,12';

const IMPORT_CSV = [
  'well,date,lat,lon,oil_sm3,gas_sm3,water_sm3,on_stream_h,bhp_bar,whp_bar,choke_pct',
  'P-01,2026-10-21,9.7421,-63.1802,294.1,45600,50.9,24,182.4,31.6,48',
  'P-01,2026-10-22,,,291.8,45100,51.7,24,181.9,31.4,48',
  'P-02,2026-10-21,9.7388,-63.1755,65.2,13300,30.2,22.5,,,',
  'P-02,2026-10-22,,,63.9,13100,31.1,24,,,',
].join('\n');

async function openMap(page: Page): Promise<void> {
  await page.route('**/glyphs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/x-protobuf', body: '' }),
  );
  await page.goto(`/?vista=${INITIAL_VIEW}`);
  await expect(page.getByRole('region', { name: 'Mapa de pozos' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function openPublicWell(page: Page): Promise<void> {
  const tiles = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.startsWith('/api/tiles/wells/') &&
      url.searchParams.get('field') === 'synthetic-alpha' &&
      response.status() === 200
    );
  });
  await page.getByRole('combobox', { name: 'Campo' }).selectOption({ label: 'SYNTHETIC ALPHA' });
  await tiles;
  await expect(page.getByTestId('well-count')).toHaveText('20 pozos');
  const map = page.getByRole('region', { name: 'Mapa de pozos' });
  const box = await map.boundingBox();
  if (box === null) throw new Error('The map has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('well-sheet')).toBeVisible();
}

test('shows the log tracks of a public well', async ({ page }) => {
  await openMap(page);
  await openPublicWell(page);
  const sheet = page.getByTestId('well-sheet');
  await sheet.getByRole('tab', { name: 'Registros' }).click();
  await expect(
    sheet.getByRole('img', { name: /Registros de pozo: (GR|NPHI|RHOB|RT)/ }),
  ).toBeVisible();
  await expect(
    sheet.getByRole('button', { name: /Exportar CSV: Registros de pozo/ }),
  ).toBeVisible();
});

test('compares another well of the field and writes it to the URL', async ({ page }) => {
  await openMap(page);
  await openPublicWell(page);
  const sheet = page.getByTestId('well-sheet');
  await sheet.getByRole('tab', { name: 'Producción' }).click();
  const select = sheet.getByLabel('Pozo para comparar');
  await expect
    .poll(async () => select.locator('option').count(), { timeout: 10_000 })
    .toBeGreaterThan(1);
  const value = await select.locator('option').nth(1).getAttribute('value');
  if (value === null) throw new Error('The comparison select has no value');
  await select.selectOption(value);
  await expect(sheet.getByRole('heading', { name: 'Tasas comparadas' })).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('comparar'), { timeout: 5_000 })
    .not.toBeNull();
});

test('imports a CSV, opens the well and exports it', async ({ page }) => {
  await openMap(page);
  const filterPanel = page.getByRole('complementary', { name: 'Filtros de pozos' });
  await filterPanel.getByLabel('Archivo CSV').setInputFiles({
    name: 'pozos.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(IMPORT_CSV, 'utf8'),
  });
  await expect(filterPanel.getByText(/Se importaron 4 días en 2 pozos/)).toBeVisible();

  const imported = filterPanel.getByRole('listitem').filter({ hasText: 'P-01' });
  await imported.getByRole('button', { name: 'Abrir' }).click();
  const sheet = page.getByTestId('well-sheet');
  await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('P-01');
  await expect(sheet.getByText(/Pozo importado desde un CSV/)).toBeVisible();

  const download = await Promise.all([
    page.waitForEvent('download'),
    sheet.getByRole('button', { name: 'Descargar CSV del pozo' }).click(),
  ]);
  expect(download[0].suggestedFilename()).toBe('p-01.csv');

  await sheet.getByRole('tab', { name: 'Producción' }).click();
  await expect(sheet.getByRole('heading', { name: 'Tasas de producción' })).toBeVisible();
});
