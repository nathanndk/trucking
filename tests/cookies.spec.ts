import { test, expect } from '@playwright/test';

const cookieName = 'genesis_cookie_consent';
for (const choice of ['Terima semua', 'Hanya yang diperlukan']) {
  test(`decision persists: ${choice}`, async ({ page, context }) => {
    await page.goto('/');
    await expect(page.locator('#cookie-banner')).toBeVisible();
    await page.getByRole('button', { name: choice, exact: true }).click();
    await expect(page.locator('#cookie-banner')).toBeHidden();
    const cookie = (await context.cookies()).find((value) => value.name === cookieName)!;
    expect(cookie.path).toBe('/');
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.httpOnly).toBe(false);
    expect(cookie.expires - Date.now() / 1000).toBeGreaterThan(179 * 86400);
    expect(cookie.expires - Date.now() / 1000).toBeLessThanOrEqual(180 * 86400);
    expect(JSON.parse(decodeURIComponent(cookie.value)).choice).toBe(
      choice === 'Terima semua' ? 'all' : 'necessary',
    );
    await page.reload();
    await expect(page.locator('#cookie-banner')).toBeHidden();
    await page.goto('/about');
    await expect(page.locator('#cookie-banner')).toBeHidden();
    await page.getByRole('button', { name: 'Pengaturan cookies', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Simpan pengaturan' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#cookie-footer-open')).toBeFocused();
  });
}

test('mobile panel, focus, keyboard and information page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Belum digunakan', { exact: true })).toHaveCount(2);
  await expect(dialog.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Tutup', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Pengaturan', exact: true })).toBeFocused();
  await expect(page.locator('#cookie-banner')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Pengaturan', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan pengaturan' }).click();
  await page.goto('/cookies');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Penggunaan cookies.');
  await expect(page.locator('#cookie-banner')).toBeHidden();
  await page.goto('/admin/login');
  await expect(page.locator('#cookie-banner')).toHaveCount(0);
});

for (const [label, value] of [
  ['malformed', '%invalid'],
  [
    'old version',
    encodeURIComponent(JSON.stringify({ version: 0, choice: 'all', savedAt: Date.now() })),
  ],
  [
    'expired decision',
    encodeURIComponent(
      JSON.stringify({ version: 1, choice: 'all', savedAt: Date.now() - 181 * 86400000 }),
    ),
  ],
  [
    'invalid choice',
    encodeURIComponent(JSON.stringify({ version: 1, choice: 'other', savedAt: Date.now() })),
  ],
]) {
  test(`requests decision for ${label}`, async ({ page, context }) => {
    await context.addCookies([{ name: cookieName, value, url: 'http://localhost:4322' }]);
    await page.goto('/');
    await expect(page.locator('#cookie-banner')).toBeVisible();
  });
}

test('removed cookies request a new decision', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Terima semua', exact: true }).click();
  await context.clearCookies();
  await page.reload();
  await expect(page.locator('#cookie-banner')).toBeVisible();
});

for (const throws of [false, true]) {
  test(`blocked cookie storage remains usable (throws: ${throws})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript((shouldThrow) => {
      Object.defineProperty(document, 'cookie', {
        get() {
          if (shouldThrow) throw new Error('Blocked');
          return '';
        },
        set() {
          if (shouldThrow) throw new Error('Blocked');
        },
      });
    }, throws);
    await page.goto('/');
    await page.getByRole('button', { name: 'Hanya yang diperlukan', exact: true }).click();
    await expect(page.locator('#cookie-banner')).toBeHidden();
    await page.getByRole('button', { name: 'Pengaturan cookies', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    await page.reload();
    await expect(page.locator('#cookie-banner')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
