import { expect, test } from '@playwright/test';

const FIELD_SLUG = 'synthetic-alpha';
const FIELD_NAME = 'SYNTHETIC ALPHA';
/** Synthetic well SYNA-01 and the zoom at which the wells layer shows individual symbols. */
const INITIAL_VIEW = '64.5651,2.93883,12';

function parseView(value: string | null): [number, number, number] {
  const [lat, lon, zoom] = (value ?? '').split(',').map(Number);
  if (lat === undefined || lon === undefined || zoom === undefined) {
    throw new Error(`Invalid vista: ${String(value)}`);
  }
  return [lat, lon, zoom];
}

test('filters the map, opens a well and keeps the view after a reload', async ({ page }) => {
  // The test basemap has no glyph server, and the map does not need labels for this flow.
  await page.route('**/glyphs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/x-protobuf', body: '' }),
  );

  await page.goto(`/?vista=${INITIAL_VIEW}`);
  const map = page.getByRole('region', { name: 'Mapa de pozos' });
  await expect(map).toHaveAttribute('aria-busy', 'false');

  const filteredTiles = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.startsWith('/api/tiles/wells/') &&
      url.searchParams.get('field') === FIELD_SLUG &&
      response.status() === 200
    );
  });
  await page.getByLabel('Campo').selectOption({ label: FIELD_NAME });
  await filteredTiles;

  const count = page.getByTestId('well-count');
  await expect(count).toHaveText('20 pozos');
  await expect(page.getByLabel('Campo')).toHaveValue(FIELD_SLUG);

  const box = await map.boundingBox();
  if (box === null) throw new Error('The map has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  const sheet = page.getByTestId('well-sheet');
  await expect(sheet).toBeVisible();
  const heading = sheet.getByRole('heading', { level: 2 });
  await expect(heading).toHaveText(/SYN-A-\d+/);
  const wellName = (await heading.textContent())?.trim() ?? '';

  await expect
    .poll(() => new URL(page.url()).searchParams.get('pozo'), { timeout: 5_000 })
    .not.toBeNull();
  const beforeView = parseView(new URL(page.url()).searchParams.get('vista'));

  await page.reload();
  await expect(count).toHaveText('20 pozos');
  await expect(page.getByLabel('Campo')).toHaveValue(FIELD_SLUG);
  await expect(sheet).toBeVisible();
  await expect(heading).toHaveText(wellName);

  const afterView = parseView(new URL(page.url()).searchParams.get('vista'));
  expect(afterView[0]).toBeCloseTo(beforeView[0], 3);
  expect(afterView[1]).toBeCloseTo(beforeView[1], 3);
  expect(afterView[2]).toBeCloseTo(beforeView[2], 2);
});
