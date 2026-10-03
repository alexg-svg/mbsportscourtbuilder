import { expect, test, type Page } from '@playwright/test';

// Third-party scripts (analytics, reCAPTCHA, ZIP lookup) are blocked so the
// tests don't depend on the network.
test.beforeEach(async ({ page }) => {
  await page.route(/googletagmanager|google\.com\/recaptcha|zippopotam|fonts\.g/, (r) => r.abort());
});

const next = (page: Page) => page.getByRole('button', { name: /^Next →/ }).click();

async function startDesign(page: Page, property: string, sport: string) {
  await page.goto('/');
  await page.getByText(property, { exact: true }).first().click();
  await expect(page.getByText('Which sport?')).toBeVisible();
  await page.getByText(sport, { exact: true }).first().click();
  await next(page);
}

test('a customer can design a court and submit a quote', async ({ page }) => {
  let payload: any;
  await page.route('**/api/send-quote', async (r) => {
    payload = r.request().postDataJSON();
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await startDesign(page, 'Residential', 'Pickleball');
  await next(page);                                     // size
  await page.getByText('Midnight').click();             // colors
  await page.getByText('Textured', { exact: true }).click();
  await next(page);
  await page.getByText('Pickleball Net & Posts', { exact: true }).click();
  await next(page);

  await page.getByPlaceholder('Jane Smith').fill('Test Person');
  await page.getByPlaceholder('(555) 000-0000').fill('3105551234');
  await expect(page.getByPlaceholder('(555) 000-0000')).toHaveValue('(310) 555-1234');
  await page.getByPlaceholder('jane@example.com').fill('test.person@gmail.com');
  await page.getByPlaceholder('e.g. 90210').fill('90210');
  await page.getByLabel('When do you want it built?').selectOption('asap');
  await page.getByRole('button', { name: 'Submit My Design →' }).click();

  await expect(page.getByText('Design Submitted!')).toBeVisible({ timeout: 30_000 });
  expect(payload.contact).toMatchObject({ name: 'Test Person', zip: '90210', timeline: 'asap' });
  expect(payload.config).toMatchObject({ type: 'pickleball', surfaceFinish: 'textured', selectedAccessories: ['pickleball-net'] });
  expect(payload.config.logo).toBeUndefined();
  expect(payload.courtImageBase64?.length).toBeGreaterThan(1000);
  expect(payload.pdfBase64?.length).toBeGreaterThan(1000);
});

test('fake contact details are caught before submitting', async ({ page }) => {
  await startDesign(page, 'Residential', 'Basketball');
  for (let i = 0; i < 3; i++) await next(page);
  await page.getByPlaceholder('jane@example.com').fill('someone@mailinator.com');
  await page.getByPlaceholder('e.g. 90210').fill('00000');
  await page.getByPlaceholder('Jane Smith').click();
  await expect(page.getByText('Please use your real email address.')).toBeVisible();
  await expect(page.getByText('Enter a valid ZIP code.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit My Design →' })).toBeDisabled();
});

test('share and PDF are offered only after submitting, and the link reopens the design', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.route('**/api/send-quote', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));

  await startDesign(page, 'Commercial', 'Tennis');
  await next(page);
  await page.getByText('Park Green').click();
  // Not available while designing
  await expect(page.getByRole('button', { name: /Share/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /PDF/ })).toHaveCount(0);

  await next(page); await next(page);
  await page.getByPlaceholder('Jane Smith').fill('Test Person');
  await page.getByPlaceholder('jane@example.com').fill('test.person@gmail.com');
  await page.getByPlaceholder('e.g. 90210').fill('90210');
  await page.getByRole('button', { name: 'Submit My Design →' }).click();
  await expect(page.getByText('Design Submitted!')).toBeVisible({ timeout: 30_000 });

  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Save PDF' }).click()]);
  expect(pdf.suggestedFilename()).toBe('MB-Sports-tennis-court-design.pdf');

  await page.getByRole('button', { name: 'Share link' }).click();
  await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  const other = await context.newPage();
  await other.goto(url);
  await expect(other.getByText('Pick your colors')).toBeVisible();
  await expect(other.getByText('Forest Green')).toBeVisible();

  // A fresh tab, as when someone opens a damaged link
  const broken = await context.newPage();
  await broken.goto('/#d=garbage');
  await expect(broken.getByText('What type of property?')).toBeVisible();
});

test('custom sizes are kept to whole feet within limits', async ({ page }) => {
  await startDesign(page, 'Residential', 'Shuffleboard');
  await page.getByText('Custom Dimensions', { exact: true }).click();
  const [length, width] = [page.locator('input[type=number]').nth(0), page.locator('input[type=number]').nth(1)];
  await length.fill('47.5'); await width.click();
  await expect(length).toHaveValue('48');
  await length.fill('999'); await width.click();
  await expect(length).toHaveValue('300');
  await width.fill('2'); await length.click();
  await expect(width).toHaveValue('4');
});

test('the zone color is only offered where the court has one', async ({ page }) => {
  await startDesign(page, 'Residential', 'Bocce Ball');
  await next(page);
  await expect(page.getByText('Pick your colors')).toBeVisible();
  await expect(page.getByText(/Kitchen|Service Box|Key \/ Paint/)).toHaveCount(0);
});

test('an unfinished design is offered back on the next visit', async ({ page }) => {
  await startDesign(page, 'Residential', 'Volleyball');
  await next(page);
  await page.getByText('Desert Clay').click();
  await page.waitForTimeout(600); // autosave debounce
  await page.reload();
  await expect(page.getByText('Pick up where you left off?')).toBeVisible();
  await page.getByRole('button', { name: 'Continue my design' }).click();
  await expect(page.getByText('Pick your colors')).toBeVisible();
  await expect(page.getByText('Clay Orange')).toBeVisible();
});

test('the Step 1 showcase loads a sample design', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show Futsal court' }).click();
  await page.getByRole('button', { name: /Start with this design/ }).click();
  await expect(page.getByText('Pick your colors')).toBeVisible();
  await expect(page.locator('span.font-mono').first()).toHaveText('131 × 66 ft');
});

test('phones see a live preview on every step', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startDesign(page, 'Residential', 'Tennis');
  await expect(page.getByRole('button', { name: 'Open the full court preview' })).toBeVisible();
});

test('the 3D view renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await startDesign(page, 'Residential', 'Basketball');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Night', exact: true }).click();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('pick-one accessories replace each other and windscreen needs chain link', async ({ page }) => {
  await startDesign(page, 'Commercial', 'Tennis');
  await next(page); await next(page);
  const card = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) });
  const checked = async (name: string) => (await card(name).locator('svg.lucide-check').count()) > 0;

  await card('Chain Link Fence').click();
  await card('Vinyl Fence').click();
  expect(await checked('Chain Link Fence')).toBe(false);
  expect(await checked('Vinyl Fence')).toBe(true);

  await card('Windscreen').click();               // brings chain link back, replacing vinyl
  expect(await checked('Chain Link Fence')).toBe(true);
  expect(await checked('Vinyl Fence')).toBe(false);
  expect(await checked('Windscreen')).toBe(true);

  await card('Player Benches \\(2\\)').click();
  await card('Player Benches \\(4\\)').click();
  expect(await checked('Player Benches \\(2\\)')).toBe(false);
  expect(await checked('Player Benches \\(4\\)')).toBe(true);

  await card('Water Fountain').click();
  await card('Scoreboard').click();
  expect(await checked('Water Fountain')).toBe(true);
  expect(await checked('Scoreboard')).toBe(true);
});
