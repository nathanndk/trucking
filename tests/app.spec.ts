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
  '/admin/text',
  '/admin/services',
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
      // The mobile menu is a sheet that opens once the header island has hydrated.
      for (const [route, open, menu] of [
        ['/', 'Buka navigasi', 'Navigasi seluler'],
        ['/en', 'Open navigation', 'Mobile navigation'],
      ] as const) {
        await page.goto(route);
        await page.locator('astro-island:not([ssr]) .navbar').waitFor();
        await page.getByLabel(open).click();
        await expect(page.getByRole('navigation', { name: menu })).toBeVisible();
      }
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
  // robots.txt is public, so it must not advertise where the CMS lives.
  expect(await robots.text()).not.toMatch(/admin|_actions|api/i);
  // Nothing on the public website links to or names the admin area.
  for (const route of [...publicRoutes, '/not-a-page', '/sitemap.xml']) {
    const html = await (await request.get(route)).text();
    expect(html, route).not.toMatch(/\/admin|admin-|sign in/i);
    // No developer notes in the markup (framework markers such as <!--astro:end--> are fine).
    expect(html, route).not.toMatch(/<!--[^>]*[a-z]{3,} [a-z]{3,}[^>]*-->/i);
  }
  const sitemap = await request.get('/sitemap.xml');
  const sitemapXml = await sitemap.text();
  expect(sitemapXml.match(/<url>/g)).toHaveLength(publicRoutes.length);
  expect(sitemapXml).toContain('/en/services</loc>');
  expect(sitemapXml).not.toContain('/fleet');
  // Fleet and coverage were removed from the website and the CMS.
  for (const hidden of ['/fleet', '/coverage', '/en/fleet'])
    expect((await request.get(hidden)).status()).toBe(404);
  for (const action of [
    'saveCopy',
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
    // Refused before validation, so the reply says nothing about the CMS data model.
    expect(r.status(), action).toBe(401);
    expect(await r.text(), action).not.toMatch(/issues|companyName|collection|services/);
  }
  const formStyle = await request.post('/contact?_action=upload', {
    headers: { Origin: 'http://localhost:4322' },
    multipart: { folder: 'general' },
  });
  expect(formStyle.status()).toBe(401);
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
      // On small screens the sidebar opens as a sheet.
      await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
      const menu = page.getByRole('dialog');
      await expect(menu.getByRole('link', { name: 'Settings' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
    }
  }
  // The CMS only manages what the public website shows.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin');
  const sidebar = page.locator('[data-slot="sidebar"]');
  await expect(sidebar.getByRole('link', { name: 'Services' })).toBeVisible();
  for (const removed of ['Fleet', 'Coverage'])
    await expect(sidebar.getByRole('link', { name: removed })).toHaveCount(0);
  for (const removed of ['/admin/fleet', '/admin/coverage'])
    expect((await page.request.get(removed)).status()).toBe(404);
  // The dashboard leads with what needs attention.
  await expect(page.getByRole('list', { name: 'Requests by status' })).toContainText('Quoted');
  await expect(page.getByText('Website checklist')).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp number: open Settings' })).toBeVisible();
  // Signing out lives in the account menu at the bottom of the sidebar.
  await page.getByRole('button', { name: /^Account menu for/ }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
test('complete CMS CRUD, publication, ordering and uploads for every collection', async ({
  page,
  adminSession,
}, testInfo) => {
  await page.context().addCookies(adminSession);
  // The last entry is the public page a published record appears on.
  for (const [collection, singular, titleLabel, extras, route] of [
    ['services', 'service', 'Title', {}, '/services'],
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
    const titleField = dialog.getByLabel(new RegExp(`^${titleLabel}`));
    const englishTitle = dialog.getByLabel(new RegExp(`^English ${titleLabel}$`, 'i'));
    if (collection === 'services') {
      // The editor shows one language at a time, Indonesian first.
      await expect(titleField).toBeVisible();
      await expect(englishTitle).toBeHidden();
      // Saving from the English tab with the required Indonesian title missing brings
      // the Indonesian tab back instead of failing silently.
      await dialog.getByRole('tab', { name: 'English' }).click();
      await expect(titleField).toBeHidden();
      await dialog.getByRole('button', { name: 'Save changes' }).click();
      await expect(titleField).toBeVisible();
    }
    await titleField.fill(title);
    await dialog.getByRole('tab', { name: 'English' }).click();
    await englishTitle.fill(`${title} in English`);
    // Switching back keeps what was typed in the other language.
    await dialog.getByRole('tab', { name: 'Indonesian' }).click();
    await expect(titleField).toHaveValue(title);
    for (const [label, value] of Object.entries(extras))
      await dialog.getByLabel(label, { exact: false }).fill(value);
    await dialog
      .getByLabel('Description', { exact: true })
      .fill('A verified test record for end-to-end acceptance.');
    await dialog.getByLabel('Sort order').fill('999');
    await dialog
      .locator('input[type=file]')
      .setInputFiles(path.resolve('public/images/genesis/service-trucking-640.webp'));
    await expect(dialog.getByAltText(/preview/)).toBeVisible();
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
    expect(await publicHtml()).not.toContain(title);
    await page.getByRole('button', { name: `Actions for ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Publish', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Changes saved successfully' }),
    ).toBeVisible();
    expect(await publicHtml()).toContain(title);
    expect(await publicHtml()).not.toContain(`${title} in English`);
    expect(await publicHtml('/en')).toContain(`${title} in English`);
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
    expect(await publicHtml()).not.toContain(`${title} edited`);
    await page.getByRole('button', { name: `Actions for ${title} edited` }).click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    // Deleting reloads the list; wait for it so the next navigation cannot race the reload.
    const reloaded = page.waitForEvent('load');
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    await reloaded;
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
  await page.getByRole('radio', { name: /40 feet/ }).click();
  await expect(page.getByRole('radio', { name: /40 feet/ })).toBeChecked();
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
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  // The sidebar flags requests nobody has followed up yet.
  await expect(page.locator('[data-slot="sidebar-menu-badge"]').last()).toHaveText('1 new');
  // The board is the default view; each card opens the request's details.
  await page
    .getByRole('button', { name: `View inquiry from ${values.fullName}`, exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText(values.message);
  await expect(page.getByRole('dialog')).toContainText('Angkutan Kontainer');
  await expect(page.getByRole('dialog')).toContainText('40ft');
  await page.getByLabel('Inquiry status', { exact: true }).selectOption('quoted');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Inquiry status updated' }),
  ).toBeVisible();
  // The table view lists the same request with its new status.
  await page.getByRole('tab', { name: 'Table' }).click();
  const tableRow = page.getByRole('row').filter({ hasText: values.fullName });
  await expect(tableRow).toContainText('Quoted');
  await expect(tableRow.getByRole('button', { name: 'View inquiry' })).toBeVisible();
  const after = database();
  expect(after.prepare('SELECT status FROM inquiries WHERE id=?').get(row.id)).toEqual({
    status: 'quoted',
  });
  after.close();
});
test('dragging an inquiry card to another column changes its status', async ({
  page,
  adminSession,
}) => {
  await page.context().addCookies(adminSession);
  const db = database();
  const now = Date.now();
  db.prepare(
    `INSERT INTO inquiries (full_name, company, phone, email, pickup, destination, cargo, weight, vehicle, message, service_type, container_type, status, created_at, updated_at)
     VALUES ('Drag Tester','PT Seret','+62 811 0000 1111','drag@example.com','Karawang','Tanjung Priok','','','','','Trucking Domestik','20ft','new',?,?)`,
  ).run(now, now);
  const status = () =>
    (
      db.prepare("SELECT status FROM inquiries WHERE email='drag@example.com'").get() as {
        status: string;
      }
    ).status;
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/admin/inquiries');
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    const card = (await page.getByText('Drag Tester', { exact: true }).boundingBox())!;
    const column = (await page.getByText('Contacted', { exact: true }).boundingBox())!;
    await page.mouse.move(card.x + 20, card.y + 8);
    await page.mouse.down();
    await page.mouse.move(card.x + 40, card.y + 30, { steps: 5 });
    await page.mouse.move(column.x + 60, column.y + 110, { steps: 15 });
    await page.mouse.up();
    await expect.poll(status).toBe('contacted');
    await expect(page.getByText('Drag Tester moved to Contacted.')).toBeVisible();
    // The board fits small screens by scrolling inside its own area.
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  } finally {
    db.prepare("DELETE FROM inquiries WHERE email='drag@example.com'").run();
    db.close();
  }
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
  await expect(page.getByRole('radio', { name: /20-foot/ })).toBeChecked();
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
  // Unknown English URLs get the English 404 page. Fetched without the page so the
  // expected 404 is not reported as a browser console error.
  const missing = await page.request.get('/en/not-a-page');
  expect(missing.status()).toBe(404);
  const missingHtml = await missing.text();
  expect(missingHtml).toContain('<html lang="en"');
  expect(missingHtml).toContain('This page does not exist.');
});
test('home: quick quote, services menu and common questions, in both languages', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const text of [
    {
      home: '/',
      prefix: '',
      service: 'Trucking Domestik',
      size: /40 feet/,
      submit: 'Lanjut ke form',
      nav: 'Navigasi utama',
      menu: 'Layanan',
      all: 'Semua layanan',
      first: 'Angkutan kontainer 20 dan 40 feet, trucking domestik',
      question: 'Ukuran kontainer apa yang dilayani?',
      answer: 'Kontainer 20 feet dan 40 feet.',
    },
    {
      home: '/en',
      prefix: '/en',
      service: 'Domestic Trucking',
      size: /40-foot/,
      submit: 'Continue to the form',
      nav: 'Main navigation',
      menu: 'Services',
      all: 'All services',
      first: '20 and 40-foot container transport, domestic trucking',
      question: 'Which container sizes do you carry?',
      answer: '20-foot and 40-foot containers.',
    },
  ]) {
    // Quick quote: both choices arrive selected on the quote form.
    await page.goto(text.home);
    const quick = page.locator('.quick-quote');
    await quick.locator('[name="service"]').selectOption({ label: text.service });
    await quick.locator('[name="container"]').selectOption('40ft');
    await quick.getByRole('button', { name: text.submit }).click();
    await expect(page).toHaveURL(
      new RegExp(`${text.prefix}/contact\\?service=domestic-trucking&container=40ft$`),
    );
    await expect(page.locator('[name="serviceType"]')).toHaveValue('domestic-trucking');
    await expect(page.getByRole('radio', { name: text.size })).toBeChecked();

    // Services menu: pointing at the link lists every service; each entry opens its section.
    await page.goto(text.home);
    await page.locator('astro-island:not([ssr]) .navbar').waitFor();
    const nav = page.getByRole('navigation', { name: text.nav });
    const trigger = nav.getByRole('link', { name: text.menu, exact: true });
    await trigger.hover();
    const panel = page.locator('.services-menu');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link')).toHaveCount(6);
    expect(
      await panel
        .getByRole('link')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    ).toEqual([
      ...[
        'container-transportation',
        'domestic-trucking',
        'factory-to-port-transportation',
        'customs-clearance-assistance',
        'logistics-shipping-coordination',
      ].map((slug) => `${text.prefix}/services#${slug}`),
      `${text.prefix}/services`,
    ]);
    await expect(panel.getByRole('link', { name: text.all })).toBeVisible();
    await panel.getByRole('link', { name: text.service }).click();
    await expect(page).toHaveURL(new RegExp(`${text.prefix}/services#domestic-trucking$`));
    await expect(page.locator('#domestic-trucking')).toBeInViewport();
    // The link itself still opens the Services page.
    await page.goto(text.home);
    await page.locator('astro-island:not([ssr]) .navbar').waitFor();
    await nav.getByRole('link', { name: text.menu, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${text.prefix}/services$`));

    // Common questions: one answer open at a time, and the same text as structured data.
    await page.goto(text.home);
    const faq = page.locator('#faq');
    await faq.scrollIntoViewIfNeeded();
    await faq.locator('astro-island:not([ssr])').waitFor();
    await expect(faq.getByRole('button')).toHaveCount(6);
    await expect(faq.getByText(text.first)).toBeVisible();
    await faq.getByRole('button', { name: text.question }).click();
    await expect(faq.getByText(text.answer)).toBeVisible();
    await expect(faq.getByText(text.first)).toBeHidden();
    await faq.getByRole('button', { name: text.question }).click();
    await expect(faq.getByText(text.answer)).toBeHidden();
    const structured = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent!)));
    const faqData = structured.find((entry) => entry['@type'] === 'FAQPage');
    expect(faqData.mainEntity).toHaveLength(6);
    expect(faqData.mainEntity[1].name).toBe(text.question);
    expect(faqData.mainEntity[1].acceptedAnswer.text).toContain(text.answer);
  }
  // Without JavaScript the quick quote and the Services link still work.
  const context = await browser.newContext({ javaScriptEnabled: false, locale: 'id-ID' });
  const plain = await context.newPage();
  await plain.goto('http://localhost:4322/');
  await plain.locator('.quick-quote [name="container"]').selectOption('20ft');
  await plain.locator('.quick-quote button[type="submit"]').click();
  await expect(plain).toHaveURL(/\/contact\?service=&container=20ft$/);
  await expect(plain.locator('#container-20ft')).toHaveAttribute('aria-checked', 'true');
  await plain.goto('http://localhost:4322/');
  await plain.locator('.desktop-nav').getByRole('link', { name: 'Layanan', exact: true }).click();
  await expect(plain).toHaveURL(/\/services$/);
  await context.close();
});
test('the first page follows the visitor, and a manual language choice is remembered', async ({
  browser,
  page,
  request,
}) => {
  const site = 'http://localhost:4322';
  // The test server sees every visitor on loopback, which carries no location, so the
  // browser language stands in for it here. Address lookups are covered by unit tests.
  const abroad = await browser.newContext({ locale: 'en-US' });
  const visitor = await abroad.newPage();
  await visitor.goto(`${site}/services`);
  await expect(visitor).toHaveURL(`${site}/en/services`);
  await expect(visitor.locator('html')).toHaveAttribute('translate', 'no');
  expect(await visitor.locator('meta[name="google"]').getAttribute('content')).toBe('notranslate');
  // Choosing Indonesian is respected immediately…
  await visitor.locator('.nav-actions a[hreflang="id"]').click();
  await expect(visitor).toHaveURL(`${site}/services`);
  await expect(visitor.locator('html')).toHaveAttribute('lang', 'id');
  await visitor.locator('.desktop-nav a[href="/about"]').click();
  await expect(visitor).toHaveURL(`${site}/about`);
  // …and on the next arrival from outside the site.
  await visitor.goto(`${site}/`);
  await expect(visitor).toHaveURL(`${site}/`);
  // Switching back to English is remembered the same way.
  await visitor.locator('.nav-actions a[hreflang="en"]').click();
  await expect(visitor).toHaveURL(`${site}/en`);
  await visitor.goto(`${site}/contact?container=40ft`);
  await expect(visitor).toHaveURL(`${site}/en/contact?container=40ft`);
  await abroad.close();
  // A visitor browsing in Indonesian stays on the unprefixed pages.
  await page.goto('/');
  await expect(page).toHaveURL(`${site}/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  // Crawlers and link previews are never redirected, so both versions can be indexed.
  const english = { 'Accept-Language': 'en-US,en;q=0.9' };
  for (const agent of ['Googlebot/2.1 (+http://www.google.com/bot.html)', 'WhatsApp/2.23'])
    expect(
      (
        await request.get('/', { headers: { ...english, 'User-Agent': agent }, maxRedirects: 0 })
      ).status(),
    ).toBe(200);
  const first = await request.get('/about', { headers: english, maxRedirects: 0 });
  expect(first.status()).toBe(302);
  expect(first.headers().location).toBe('/en/about');
  expect(first.headers()['cache-control']).toBe('no-store');
  // Only public pages take part.
  for (const other of ['/sitemap.xml', '/robots.txt', '/admin/login'])
    expect((await request.get(other, { headers: english, maxRedirects: 0 })).status()).toBe(200);
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
test('section wording is edited on the Page text screen, in both languages', async ({
  page,
  adminSession,
}) => {
  await page.context().addCookies(adminSession);
  const html = async (route: string) => (await page.request.get(route)).text();
  const defaultHeading = 'Dari pabrik ke Tanjung Priok, kontainer Anda kami antar.';
  try {
    await page.goto('/admin/text');
    // Wait for the editor to become interactive before typing into it.
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    const heading = page.getByLabel('Main heading (Indonesian)');
    await expect(heading).toHaveValue(defaultHeading);
    await heading.fill('Kontainer Anda, urusan kami.');
    await page.getByLabel('Main heading (English)').fill('Your containers, handled.');
    await expect(page.getByText('1 unsaved change', { exact: true })).toBeVisible();
    // Edits survive switching between page tabs.
    await page.getByRole('tab', { name: 'Contact' }).click();
    await page.getByLabel('Send button (Indonesian)').fill('Kirim sekarang');
    await page.getByRole('tab', { name: 'Home' }).click();
    await expect(heading).toHaveValue('Kontainer Anda, urusan kami.');
    // The common questions are editable too, and the structured data follows.
    await page.getByLabel('Question 1 (Indonesian)').fill('Layanan apa yang ada?');
    await expect(page.getByText('3 unsaved changes', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Text saved' })).toBeVisible();
    await expect(page.getByText('No unsaved changes')).toBeVisible();

    expect(await html('/')).toContain('Kontainer Anda, urusan kami.');
    expect(await html('/')).not.toContain(defaultHeading);
    expect(await html('/')).toContain('"name":"Layanan apa yang ada?"');
    expect(await html('/')).not.toContain('Layanan apa saja yang tersedia?');
    expect(await html('/en')).toContain('Your containers, handled.');
    expect(await html('/contact')).toContain('Kirim sekarang');
    // Only the language that was changed is affected.
    expect(await html('/en/contact')).toContain('Send request');

    // Search finds wording on any page; Reset returns it to the default.
    await page.getByLabel('Search text').fill('Kirim sekarang');
    await expect(page.getByText('Contact / Quote form')).toBeVisible();
    await expect(page.getByLabel('Send button (Indonesian)')).toHaveValue('Kirim sekarang');
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByLabel('Search text').fill('');
    // A cleared field also goes back to its default.
    await heading.fill('');
    await page.getByLabel('Main heading (English)').fill('');
    await page.getByLabel('Question 1 (Indonesian)').fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Text saved' })).toBeVisible();
    await expect(heading).toHaveValue(defaultHeading);
    expect(await html('/')).toContain(defaultHeading);
    expect(await html('/contact')).toContain('Kirim permintaan');
    expect(await html('/en')).toContain('we deliver your containers');
    const db = database();
    expect(db.prepare("SELECT count(*) AS n FROM site_copy WHERE id<>'' OR en<>''").get()).toEqual({
      n: 0,
    });
    db.close();
    // Small screens keep the form inside the viewport.
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  } finally {
    // Never leave edited wording behind for the other tests.
    const db = database();
    db.prepare('DELETE FROM site_copy').run();
    db.close();
  }
});
test('settings changes are reflected on public pages', async ({ page, adminSession }) => {
  await page.context().addCookies(adminSession);
  await page.goto('/admin/settings');
  await page.getByLabel('Company name', { exact: false }).first().fill('GENESIS TEST');
  await page.getByLabel('Primary CTA text').fill('Diskusikan Muatan');
  // Indonesian and English sit side by side in the Company text card.
  await page.getByLabel('English CTA text').fill('Discuss your cargo');
  await page.getByLabel('WhatsApp (international digits)').fill('628123456789');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Settings saved.' })).toBeVisible();
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('GENESIS TEST');
  expect(html).toContain('Diskusikan Muatan');
  expect(await (await page.request.get('/en')).text()).toContain('Discuss your cargo');
  // Filling in a missing detail takes it off the dashboard's checklist.
  await page.goto('/admin');
  await expect(page.getByText('Website checklist')).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp number: open Settings' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Office phone: open Settings' })).toBeVisible();
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
      folder: 'services',
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
