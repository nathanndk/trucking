import { test as base, expect, type Page, type Cookie } from '@playwright/test';
import Database from 'better-sqlite3';
import path from 'node:path';
const test = base.extend<{ consoleGuard: void }, { adminSession: Cookie[] }>({
  adminSession: [
    async ({ playwright }, use) => {
      const api = await playwright.request.newContext();
      const response = await api.post('http://localhost:4322/api/auth/sign-in/email', {
        headers: { Origin: 'http://localhost:4322' },
        data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
      });
      expect(response.ok()).toBe(true);
      await use((await api.storageState()).cookies);
      await api.dispose();
    },
    { scope: 'worker' },
  ],
  consoleGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await use();
      expect(errors, 'No browser application errors').toEqual([]);
    },
    { auto: true },
  ],
});
const publicRoutes = ['/', '/about', '/services', '/fleet', '/coverage', '/projects', '/contact'];
const adminRoutes = [
  '/admin',
  '/admin/services',
  '/admin/fleet',
  '/admin/coverage',
  '/admin/projects',
  '/admin/clients',
  '/admin/inquiries',
  '/admin/settings',
];
async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email address').fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
function database() {
  return new Database(process.env.DATABASE_PATH!);
}
for (const [name, width, height] of [
  ['mobile', 375, 812],
  ['tablet', 768, 1024],
  ['desktop', 1440, 1000],
] as const) {
  test(`all public pages render without overflow: ${name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    for (const route of publicRoutes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `${route} overflow`,
      ).toBe(true);
      expect(
        await page
          .locator('img')
          .evaluateAll(
            (imgs) =>
              (imgs as HTMLImageElement[]).filter(
                (i) =>
                  (i.loading !== 'lazy' && !i.complete) || (i.complete && i.naturalWidth === 0),
              ).length,
          ),
        `${route} broken images`,
      ).toBe(0);
      if (route === '/')
        await page.screenshot({ path: testInfo.outputPath(`${name}-home.png`), fullPage: true });
    }
    if (name === 'mobile') {
      await page.getByLabel('Buka navigasi').click();
      await expect(page.getByRole('navigation', { name: 'Navigasi seluler' })).toBeVisible();
    }
  });
}
test('SEO, private routes, mutation authorization and path protection', async ({ request }) => {
  for (const route of adminRoutes) {
    const r = await request.get(route, { maxRedirects: 0 });
    expect(r.status()).toBe(303);
    expect(r.headers().location).toBe('/admin/login');
  }
  const loginPage = await request.get('/admin/login');
  expect(loginPage.status()).toBe(200);
  expect(loginPage.headers()['x-robots-tag']).toContain('noindex');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /admin');
  const sitemap = await request.get('/sitemap.xml');
  expect((await sitemap.text()).match(/<url>/g)).toHaveLength(7);
  for (const action of [
    'deleteContent',
    'publishContent',
    'saveContent',
    'saveSettings',
    'inquiryStatus',
  ]) {
    const payload =
      action === 'saveContent'
        ? {
            collection: 'services',
            title: 'Unauthorized',
            slug: 'unauthorized',
            published: true,
            sortOrder: 0,
          }
        : action === 'saveSettings'
          ? {}
          : action === 'inquiryStatus'
            ? { id: 1, status: 'closed' }
            : { collection: 'services', id: 1, published: false };
    const r = await request.post(`/_actions/${action}`, {
      headers: { Origin: 'http://localhost:4322' },
      data: payload,
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  }
  const cross = await request.post('/_actions/deleteContent', {
    headers: { Origin: 'https://evil.example' },
    data: { collection: 'services', id: 1 },
  });
  expect(cross.status()).toBe(403);
  for (const url of [
    '/data/app.db',
    '/.env',
    '/media/general/not-a-file.webp',
    '/media/%2e%2e%2fapp.db',
  ]) {
    expect((await request.get(url)).status()).toBe(404);
  }
  const signup = await request.post('/api/auth/sign-up/email', {
    headers: { Origin: 'http://localhost:4322' },
    data: { name: 'Intruder', email: 'intruder@example.com', password: 'unusable-public-password' },
  });
  expect(signup.status()).toBeGreaterThanOrEqual(400);
  const db = database();
  expect(db.prepare('SELECT count(*) AS n FROM user').get()).toEqual({ n: 1 });
  expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
  expect(db.prepare('SELECT count(*) AS n FROM services').get()).toEqual({ n: 6 });
  db.close();
});
test('admin login, all protected routes, responsive navigation and logout', async ({
  page,
}, testInfo) => {
  await login(page);
  for (const route of adminRoutes) {
    const r = await page.goto(route);
    expect(r?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
  }
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin/services');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`admin-${width}.png`), fullPage: true });
    if (width === 375) {
      await page.getByText('CMS navigation', { exact: true }).click();
      await expect(page.getByRole('navigation', { name: 'Mobile admin navigation' })).toBeVisible();
    }
  }
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
test('complete CMS CRUD, publication, ordering and uploads for every collection', async ({
  page,
  adminSession,
}, testInfo) => {
  await page.context().addCookies(adminSession);
  for (const [collection, singular, titleLabel, extras] of [
    ['services', 'service', 'Title', {}],
    ['fleet', 'vehicle', 'Vehicle name', { 'Vehicle type': 'Heavy duty', Capacity: '10 ton' }],
    ['coverage', 'service area', 'City', { Province: 'Jawa Barat' }],
    ['projects', 'project', 'Title', { 'Client name': 'Test Client', 'Project year': '2026' }],
    ['clients', 'client', 'Client name', { 'Website (optional)': 'https://example.com' }],
  ] as const) {
    await page.goto(`/admin/${collection}`);
    const title = `Test ${collection}`;
    await page.getByRole('button', { name: `Add ${singular}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(new RegExp(`^${titleLabel}`)).fill(title);
    for (const [label, value] of Object.entries(extras))
      await dialog.getByLabel(label, { exact: false }).fill(value);
    await dialog
      .getByLabel('Description', { exact: true })
      .fill('A verified test record for end-to-end acceptance.');
    await dialog.getByLabel('Sort order').fill('999');
    if (collection !== 'coverage') {
      await dialog
        .locator('input[type=file]')
        .setInputFiles(path.resolve('public/images/fleet.jpg'));
      await expect(dialog.getByAltText(/preview/)).toBeVisible();
    }
    if (collection === 'services') {
      await page.setViewportSize({ width: 375, height: 812 });
      await expect
        .poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1))
        .toBe(true);
      await page.screenshot({ path: testInfo.outputPath('mobile-editor.png'), fullPage: true });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Changes saved successfully' }),
    ).toBeVisible();
    const db = database();
    const record = db.prepare(`SELECT * FROM ${collection} WHERE title=?`).get(title) as {
      id: number;
      published: number;
      image: string;
    };
    expect(record.published).toBe(0);
    if (record.image) {
      const image = await page.request.get(record.image);
      expect(image.status()).toBe(200);
      expect(image.headers()['content-type']).toBe('image/webp');
    }
    db.close();
    const route = collection === 'clients' ? '/projects' : `/${collection}`;
    expect(await (await page.request.get(route)).text()).not.toContain(title);
    await page.getByRole('button', { name: `Actions for ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Publish', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Changes saved successfully' }),
    ).toBeVisible();
    expect(await (await page.request.get(route)).text()).toContain(title);
    await page.getByRole('button', { name: title, exact: true }).click();
    await page
      .getByRole('dialog')
      .getByLabel(new RegExp(`^${titleLabel}`))
      .fill(`${title} edited`);
    await page.getByRole('dialog').getByLabel('Sort order').fill('0');
    await page.getByRole('dialog').getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('button', { name: `${title} edited`, exact: true })).toBeVisible();
    const check = database();
    expect(check.prepare(`SELECT sort_order FROM ${collection} WHERE id=?`).get(record.id)).toEqual(
      { sort_order: 0 },
    );
    check.close();
    await page.getByRole('button', { name: `Actions for ${title} edited` }).click();
    await page.getByRole('menuitem', { name: 'Unpublish', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Changes saved successfully' }),
    ).toBeVisible();
    expect(await (await page.request.get(route)).text()).not.toContain(`${title} edited`);
    await page.getByRole('button', { name: `Actions for ${title} edited` }).click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(page.getByRole('button', { name: `${title} edited`, exact: true })).toHaveCount(0);
    const after = database();
    expect(after.prepare(`SELECT id FROM ${collection} WHERE id=?`).get(record.id)).toBeUndefined();
    after.close();
  }
});
test('quotation persists privately, appears to admin, and status changes', async ({
  page,
  adminSession,
}) => {
  await page.goto('/contact');
  const values = {
    fullName: 'Dewi Acceptance',
    company: 'PT Test Logistics',
    phone: '+62 812 3456 7890',
    email: 'dewi@example.com',
    pickup: 'Bekasi',
    destination: 'Surabaya',
    cargo: 'Barang palet',
    weight: '5 ton',
    message: 'Delivery next week.',
  };
  for (const [name, value] of Object.entries(values))
    await page.locator(`[name="${name}"]`).fill(value);
  await page.waitForTimeout(2100);
  await page.getByRole('button', { name: 'Kirim Permintaan' }).click();
  await expect(page.getByRole('status')).toContainText('Permintaan Anda berhasil dikirim');
  const db = database();
  const row = db.prepare('SELECT * FROM inquiries WHERE email=?').get(values.email) as {
    id: number;
    status: string;
  };
  expect(row.status).toBe('new');
  db.close();
  expect(await (await page.request.get('/contact')).text()).not.toContain(values.email);
  await page.context().addCookies(adminSession);
  await page.goto('/admin/inquiries');
  const inquiry = page.getByRole('row').filter({ hasText: values.fullName });
  await inquiry.getByRole('button', { name: 'View inquiry' }).click();
  await expect(page.getByRole('dialog')).toContainText(values.message);
  await page.getByLabel('Inquiry status', { exact: true }).selectOption('quoted');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByRole('status')).toContainText('Inquiry status updated');
  const after = database();
  expect(after.prepare('SELECT status FROM inquiries WHERE id=?').get(row.id)).toEqual({
    status: 'quoted',
  });
  after.close();
});
test('settings changes are reflected on public pages', async ({ page, adminSession }) => {
  await page.context().addCookies(adminSession);
  await page.goto('/admin/settings');
  await page.getByLabel('Company name', { exact: false }).first().fill('LINTAS TEST');
  await page.getByLabel('Primary CTA text').fill('Diskusikan Muatan');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Settings saved.' })).toBeVisible();
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('LINTAS TEST');
  expect(html).toContain('Diskusikan Muatan');
});

test('invalid mutations and revoked admin roles are rejected by the server', async ({
  page,
  adminSession,
}) => {
  await page.context().addCookies(adminSession);
  const headers = { Origin: 'http://localhost:4322' };
  const badRecord = await page.request.post('/_actions/saveContent', {
    headers,
    data: {
      collection: 'services',
      title: 'Invalid',
      slug: '../invalid',
      published: true,
      sortOrder: 0,
    },
  });
  expect(badRecord.status()).toBe(400);
  const upload = await page.request.post('/_actions/upload', {
    headers,
    multipart: {
      folder: 'fleet',
      file: {
        name: '../../payload.png',
        mimeType: 'image/png',
        buffer: Buffer.from('<script>alert(1)</script>'),
      },
    },
  });
  expect(upload.status()).toBe(400);
  const noOrigin = await page.request.post('/_actions/deleteContent', {
    data: { collection: 'services', id: 1 },
  });
  expect(noOrigin.status()).toBe(403);
  const db = database();
  db.prepare('UPDATE user SET role=? WHERE email=?').run('viewer', process.env.ADMIN_EMAIL);
  try {
    const denied = await page.request.post('/_actions/deleteContent', {
      headers,
      data: { collection: 'services', id: 1 },
    });
    expect(denied.status()).toBe(401);
    const privatePage = await page.request.get('/admin', { maxRedirects: 0 });
    expect(privatePage.status()).toBe(303);
    expect(db.prepare('SELECT id FROM services WHERE id=1').get()).toEqual({ id: 1 });
  } finally {
    db.prepare('UPDATE user SET role=? WHERE email=?').run('admin', process.env.ADMIN_EMAIL);
    db.close();
  }
});
