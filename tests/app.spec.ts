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
const pages = ['/', '/about', '/services', '/projects', '/articles', '/contact'];
// Every page exists in Indonesian (no prefix) and English (/en).
const publicRoutes = [...pages, ...pages.map((p) => (p === '/' ? '/en' : `/en${p}`))];
const adminRoutes = [
  '/admin',
  '/admin/services',
  '/admin/fleet',
  '/admin/coverage',
  '/admin/projects',
  '/admin/clients',
  '/admin/articles',
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
      await page.goto('/');
      await page.getByLabel('Buka navigasi').click();
      await expect(page.getByRole('navigation', { name: 'Navigasi seluler' })).toBeVisible();
      await page.goto('/en');
      await page.getByLabel('Open navigation').click();
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
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
  const sitemapXml = await sitemap.text();
  expect(sitemapXml.match(/<url>/g)).toHaveLength(publicRoutes.length);
  expect(sitemapXml).toContain('/en/services</loc>');
  expect(sitemapXml).not.toContain('/fleet');
  // Fleet and coverage stay in the CMS but are hidden from the public website.
  for (const hidden of ['/fleet', '/coverage', '/en/fleet'])
    expect((await request.get(hidden)).status()).toBe(404);
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
  expect(db.prepare('SELECT count(*) AS n FROM services').get()).toEqual({ n: 5 });
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
  // The last entry is the public page a published record appears on (null: hidden collection).
  for (const [collection, singular, titleLabel, extras, route] of [
    ['services', 'service', 'Title', {}, '/services'],
    [
      'fleet',
      'vehicle',
      'Vehicle name',
      { 'Vehicle type': 'Heavy duty', Capacity: '10 ton' },
      null,
    ],
    ['coverage', 'service area', 'City', { Province: 'Jawa Barat' }, null],
    [
      'projects',
      'project',
      'Title',
      { 'Client name': 'Test Client', 'Project year': '2026' },
      '/projects',
    ],
    [
      'clients',
      'client',
      'Client name',
      { 'Website (optional)': 'https://example.com' },
      '/projects',
    ],
    ['articles', 'article', 'Title', {}, '/articles'],
  ] as const) {
    const publicHtml = async (prefix = '') => (await page.request.get(`${prefix}${route}`)).text();
    await page.goto(`/admin/${collection}`);
    const title = `Test ${collection}`;
    await page.getByRole('button', { name: `Add ${singular}`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(new RegExp(`^${titleLabel}`)).fill(title);
    await dialog.getByLabel('English title').fill(`${title} in English`);
    for (const [label, value] of Object.entries(extras))
      await dialog.getByLabel(label, { exact: false }).fill(value);
    await dialog
      .getByLabel('Description', { exact: true })
      .fill('A verified test record for end-to-end acceptance.');
    await dialog.getByLabel('Sort order').fill('999');
    if (collection !== 'coverage') {
      await dialog
        .locator('input[type=file]')
        .setInputFiles(path.resolve('public/images/genesis/service-trucking-640.webp'));
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
    if (route) expect(await publicHtml()).not.toContain(title);
    await page.getByRole('button', { name: `Actions for ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Publish', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Changes saved successfully' }),
    ).toBeVisible();
    if (route) {
      expect(await publicHtml()).toContain(title);
      expect(await publicHtml()).not.toContain(`${title} in English`);
      expect(await publicHtml('/en')).toContain(`${title} in English`);
    } else {
      expect((await page.request.get(`/${collection}`)).status()).toBe(404);
    }
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
    if (route) expect(await publicHtml()).not.toContain(`${title} edited`);
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
    destination: 'Tanjung Priok',
    message: 'Delivery next week.',
  };
  for (const [name, value] of Object.entries(values))
    await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="serviceType"]').selectOption('container-transportation');
  await page.locator('[name="containerType"][value="40ft"]').check();
  await page.waitForTimeout(2100);
  await page.getByRole('button', { name: 'Kirim permintaan' }).click();
  await expect(page).toHaveURL(/\/contact\?sent=1$/);
  await expect(page.getByRole('status')).toContainText('Permintaan Anda berhasil dikirim');
  const db = database();
  const row = db.prepare('SELECT * FROM inquiries WHERE email=?').get(values.email) as {
    id: number;
    status: string;
    service_type: string;
    container_type: string;
  };
  expect(row.status).toBe('new');
  expect(row.service_type).toBe('Angkutan Kontainer');
  expect(row.container_type).toBe('40ft');
  db.close();
  expect(await (await page.request.get('/contact')).text()).not.toContain(values.email);
  await page.context().addCookies(adminSession);
  await page.goto('/admin/inquiries');
  const inquiry = page.getByRole('row').filter({ hasText: values.fullName });
  await inquiry.getByRole('button', { name: 'View inquiry' }).click();
  await expect(page.getByRole('dialog')).toContainText(values.message);
  await expect(page.getByRole('dialog')).toContainText('Angkutan Kontainer');
  await expect(page.getByRole('dialog')).toContainText('40ft');
  await page.getByLabel('Inquiry status', { exact: true }).selectOption('quoted');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByRole('status')).toContainText('Inquiry status updated');
  const after = database();
  expect(after.prepare('SELECT status FROM inquiries WHERE id=?').get(row.id)).toEqual({
    status: 'quoted',
  });
  after.close();
});
test('English pages, language switching and the English quote flow', async ({ page }) => {
  await page.goto('/en/about');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/en\/about$/);
  await expect(page.locator('link[hreflang="id"]')).toHaveAttribute('href', /[^n]\/about$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('logistics company');
  // English CMS text is used where it exists.
  await page.goto('/en/services');
  await expect(page.getByRole('heading', { name: 'Customs Clearance Assistance' })).toBeVisible();
  await page.locator('.desktop-nav').waitFor();
  await page.locator('.nav-actions a[hreflang="id"]').click();
  await expect(page).toHaveURL(/[^n]\/services$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.getByRole('heading', { name: 'Bantuan Customs Clearance' })).toBeVisible();
  await page.locator('.nav-actions a[hreflang="en"]').click();
  await expect(page).toHaveURL(/\/en\/services$/);
  // The container diagram hands the chosen size to the quote form.
  await page.locator('.scale-box.is-20').click();
  await expect(page).toHaveURL(/\/en\/contact\?container=20ft$/);
  await expect(page.locator('[name="containerType"][value="20ft"]')).toBeChecked();
  const values = {
    fullName: 'Evan English',
    company: 'Test Exports Ltd',
    phone: '+62 811 2222 3333',
    email: 'evan@example.com',
    pickup: 'Cikarang',
    destination: 'Tanjung Priok',
  };
  for (const [name, value] of Object.entries(values))
    await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="serviceType"]').selectOption({ label: 'Domestic Trucking' });
  await page.waitForTimeout(2100);
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page).toHaveURL(/\/en\/contact\?sent=1$/);
  await expect(page.getByRole('status')).toContainText('Your request has been sent');
  const db = database();
  expect(
    db
      .prepare('SELECT service_type, container_type FROM inquiries WHERE email=?')
      .get(values.email),
  ).toEqual({ service_type: 'Trucking Domestik', container_type: '20ft' });
  db.close();
  // Unknown English URLs get the English 404 page.
  const missing = await page.goto('/en/not-a-page');
  expect(missing?.status()).toBe(404);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('does not exist');
});
test('articles are public only while published, in both languages', async ({ page }) => {
  const db = database();
  const now = Date.now();
  db.prepare(
    `INSERT INTO articles (title, slug, short_description, description, title_en, description_en, published, sort_order, created_at, updated_at)
     VALUES (?,?,?,?,?,?,1,0,?,?)`,
  ).run(
    'Jadwal Operasional',
    'jadwal-operasional',
    'Ringkasan jadwal.',
    'Paragraf pertama.\n\nParagraf kedua <b>tanpa HTML</b>.',
    'Operating Schedule',
    'First paragraph.',
    now,
    now,
  );
  try {
    await page.goto('/articles');
    await page.getByRole('link', { name: 'Jadwal Operasional' }).click();
    await expect(page).toHaveURL(/\/articles\/jadwal-operasional$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jadwal Operasional');
    await expect(page.locator('.article-body p')).toHaveCount(2);
    // The body is plain text: markup typed by an editor is shown, never executed.
    await expect(page.locator('.article-body b')).toHaveCount(0);
    await page.goto('/en/articles/jadwal-operasional');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Operating Schedule');
    await expect(page.locator('.article-body')).toContainText('First paragraph.');
    expect(await (await page.request.get('/sitemap.xml')).text()).toContain(
      '/en/articles/jadwal-operasional</loc>',
    );
    db.prepare('UPDATE articles SET published=0 WHERE slug=?').run('jadwal-operasional');
    for (const url of ['/articles/jadwal-operasional', '/en/articles/jadwal-operasional'])
      expect((await page.request.get(url)).status()).toBe(404);
    expect(await (await page.request.get('/articles')).text()).not.toContain('Jadwal Operasional');
  } finally {
    db.prepare('DELETE FROM articles WHERE slug=?').run('jadwal-operasional');
    db.close();
  }
});
test('settings changes are reflected on public pages', async ({ page, adminSession }) => {
  await page.context().addCookies(adminSession);
  await page.goto('/admin/settings');
  await page.getByLabel('Company name', { exact: false }).first().fill('GENESIS TEST');
  await page.getByLabel('Primary CTA text').fill('Diskusikan Muatan');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Settings saved.' })).toBeVisible();
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('GENESIS TEST');
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
