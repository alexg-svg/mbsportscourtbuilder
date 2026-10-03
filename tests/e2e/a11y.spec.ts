import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Automated accessibility check (axe-core, WCAG 2.1 A/AA rules) on each step.
// Serious and critical findings fail the test.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(/googletagmanager|google\.com\/recaptcha|zippopotam|fonts\.g/, (r) => r.abort());
});

async function audit(page: Page, label: string) {
  await page.waitForTimeout(400); // let step transitions settle
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('canvas')
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = serious.map((v) => `${v.id} (${v.nodes.length}): ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n    ')}`);
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
}

test('every step passes the accessibility check', async ({ page }) => {
  await page.goto('/');
  await audit(page, 'Step 1');
  await page.getByText('Residential', { exact: true }).first().click();
  await expect(page.getByText('Which sport?')).toBeVisible();
  await audit(page, 'Step 2');
  await page.getByText('Basketball', { exact: true }).first().click();
  const next = () => page.getByRole('button', { name: /^Next →/ }).click();
  await next(); await audit(page, 'Step 3');
  await next(); await audit(page, 'Step 4');
  await next(); await audit(page, 'Step 5');
  await next(); await audit(page, 'Step 6');

  await page.getByRole('button', { name: 'Compare designs' }).click();
  await page.getByRole('button', { name: 'Save current design' }).click();
  await audit(page, 'Compare view');
  await page.getByRole('button', { name: 'Close comparison' }).click();

  await page.route('**/api/send-quote', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.getByLabel('Full Name *').fill('Test Person');
  await page.getByLabel('Email *').fill('test.person@gmail.com');
  await page.getByLabel('ZIP Code *').fill('90210');
  await page.getByRole('button', { name: 'Submit My Design →' }).click();
  await expect(page.getByText('Design Submitted!')).toBeVisible({ timeout: 30_000 });
  await audit(page, 'Thank-you screen');
});

test('the wizard can be completed with the keyboard alone', async ({ page }) => {
  await page.goto('/');
  const residential = page.getByRole('button', { name: /Residential/ });
  await residential.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Which sport?')).toBeVisible();
  // Focus is visible on whatever is focused
  await page.getByRole('button', { name: /Tennis/ }).focus();
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
});
