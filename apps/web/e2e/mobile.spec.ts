import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Phone flows of docs/18-diseno-responsive.md: the filter panel and the well
 * sheet are bottom sheets, the tabs scroll and axe runs on the mobile layout.
 * Runs in the `mobile` project (Pixel 7).
 */

const FIELD_SLUG = 'campo-escuela-venezuela';
const FIELD_NAME = 'CAMPO ESCUELA VENEZUELA';
/** Synthetic well VE-01 and the zoom at which the wells layer shows individual symbols. */
const INITIAL_VIEW = '9.63021,-63.21117,12';

async function openMap(page: Page): Promise<void> {
  // The test basemap has no glyph server, and the map does not need labels for this flow.
  await page.route('**/glyphs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/x-protobuf', body: '' }),
  );
  await page.goto(`/?vista=${INITIAL_VIEW}`);
  await expect(page.getByRole('region', { name: 'Mapa de pozos' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    })),
  ).toEqual([]);
}

test('the filter panel is a bottom sheet on a phone: opens, filters and closes', async ({
  page,
}) => {
  await openMap(page);

  // The map fills the screen and the panel waits below the fold.
  const panel = page.getByTestId('filter-panel');
  await expect(panel).toBeAttached();
  await expect(panel).not.toBeInViewport();

  await page.getByRole('button', { name: 'Filtros', exact: true }).tap();
  await expect(panel).toBeInViewport();

  // Filtering from the sheet still reaches the map tiles.
  const filteredTiles = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.startsWith('/api/tiles/wells/') &&
      url.searchParams.get('field') === FIELD_SLUG &&
      response.status() === 200
    );
  });
  await page.getByRole('combobox', { name: 'Campo' }).selectOption({ label: FIELD_NAME });
  await filteredTiles;
  await expect(page.getByTestId('well-count')).toHaveText('20 pozos');

  // The close button and the pull-down gesture both dismiss the sheet.
  await page.getByRole('button', { name: 'Cerrar filtros' }).tap();
  await expect(panel).not.toBeInViewport();

  await page.getByRole('button', { name: 'Filtros', exact: true }).tap();
  await expect(panel).toBeInViewport();
  // Let the slide-up animation finish: grabbing mid-flight would miss.
  await page.waitForTimeout(300);
  const grabber = page.locator('.filter-panel .sheet-grabber');
  const box = await grabber.boundingBox();
  if (box === null) throw new Error('The filter sheet has no grabber');
  await page.mouse.move(box.x + box.width / 2, box.y + 3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 240, { steps: 12 });
  await page.mouse.up();
  await expect(panel).not.toBeInViewport();
});

test('the well sheet works on a phone: tabs scroll, axe passes and reload keeps the view', async ({
  page,
}) => {
  await openMap(page);

  const map = page.getByRole('region', { name: 'Mapa de pozos' });
  const box = await map.boundingBox();
  if (box === null) throw new Error('The map has no bounding box');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

  const sheet = page.getByTestId('well-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toBeInViewport();

  // The tab row scrolls horizontally: a far-right tab stays readable.
  await sheet.getByRole('tab', { name: 'Diagnóstico' }).tap();
  await expect(sheet.getByRole('img', { name: 'Chan: RAP' })).toBeVisible();

  await expectNoViolations(page);

  // The well and the tab survive a reload through the URL state.
  await page.reload();
  const reloadedSheet = page.getByTestId('well-sheet');
  await expect(reloadedSheet).toBeVisible();
  await expect(reloadedSheet.getByRole('tab', { name: 'Diagnóstico' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
