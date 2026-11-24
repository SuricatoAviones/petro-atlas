import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Same view as map.spec: synthetic well VE-01 at the zoom of individual symbols. */
const INITIAL_VIEW = '9.63021,-63.21117,12';

async function openMap(page: Page): Promise<void> {
  // The test basemap has no glyph server; labels are not needed for these checks.
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

test('the map and the well sheet have no axe violations', async ({ page }) => {
  await openMap(page);
  await expectNoViolations(page);

  const map = page.getByRole('region', { name: 'Mapa de pozos' });
  const box = await map.boundingBox();
  if (box === null) throw new Error('The map has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('well-sheet')).toBeVisible();
  await expectNoViolations(page);
});

test('the legal pages have no axe violations', async ({ page }) => {
  await page.goto('/es/cookies');
  await expectNoViolations(page);
});

test('the English legal pages have no axe violations', async ({ page }) => {
  await page.goto('/en/aviso-legal');
  await expectNoViolations(page);
});

test('the about page has no axe violations', async ({ page }) => {
  await page.goto('/es/acerca');
  await expect(page.getByRole('heading', { level: 1, name: 'Acerca de PetroAtlas' })).toBeVisible();
  await expectNoViolations(page);
});
