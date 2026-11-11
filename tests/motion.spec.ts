import { test, expect, type Page } from '@playwright/test';
import Database from 'better-sqlite3';
import { mkdirSync, copyFileSync } from 'node:fs';

const routes = ['/', '/about', '/services', '/projects', '/articles', '/contact', '/en'];
async function ready(page: Page, route = '/') {
  await page.goto(route);
  await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'ready');
}
async function scroll(page: Page, y: number) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  // Allow both the .6s scrub and lazy image position refresh to settle.
  await page.waitForTimeout(850);
}
async function position(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      const matrix = new DOMMatrix(style.transform);
      return {
        y: matrix.m42,
        scale: matrix.m11,
        opacity: Number(style.opacity),
        dash: parseFloat(style.strokeDashoffset) || 0,
      };
    });
}
async function documentTop(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
}
function near(a: Awaited<ReturnType<typeof position>>, b: typeof a) {
  for (const key of ['y', 'scale', 'opacity', 'dash'] as const)
    expect(Math.abs(a[key] - b[key]), key).toBeLessThan(
      key === 'scale' || key === 'opacity' ? 0.003 : 0.7,
    );
}

for (const width of [375, 768, 1440]) {
  test(`all public pages remain usable during fast two-way scroll at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      await ready(page, route);
      if (width < 1024) await expect(page.locator('.pin-spacer')).toHaveCount(0);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (const top of [0, height * 0.25, height * 0.6, height, height * 0.4, 0]) {
        await page.evaluate((y) => window.scrollTo(0, y), top);
        await page.waitForTimeout(75);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          route,
        ).toBe(true);
      }
      await scroll(page, 0);
      await expect(page.locator('h1')).toBeVisible();
      if (route === '/' && width === 375)
        await page.screenshot({ path: 'docs/motion/home-mobile.png' });
    }
    expect(errors).toEqual([]);
  });
}

test('record a continuous down-up motion preview', async ({ browser }) => {
  test.setTimeout(60000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: 'test-results/motion-video', size: { width: 1440, height: 1000 } },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4322');
  await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'ready');
  const end = await documentTop(page, '.cta-band');
  for (let i = 0; i <= 200; i++) {
    const progress = i <= 100 ? i / 100 : (200 - i) / 100;
    await page.evaluate((y) => window.scrollTo(0, y), end * progress);
    await page.waitForTimeout(55);
  }
  await page.waitForTimeout(700);
  const video = page.video()!;
  await context.close();
  mkdirSync('docs/motion', { recursive: true });
  copyFileSync(await video.path(), 'docs/motion/scroll-once.webm');
});

test('failed animation chunk keeps the server-rendered page usable', async ({ page }) => {
  await page.route('**/_astro/ScrollTrigger*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'static');
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('.quick-quote button[type="submit"]').click();
  await expect(page).toHaveURL(/\/contact\?service=&container=$/);
});

test('reveals play once and stay visible after scrolling up and resizing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await expect(page.locator('[data-motion-control]')).toHaveCount(0);
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await page.waitForTimeout(1900);
  const hero = await position(page, '.hero-photo');
  expect(hero.scale).toBeCloseTo(1.15, 2);
  for (const selector of ['[data-motion="heading"]', '.service-tile', '[data-motion="route"]']) {
    const top = await documentTop(page, selector);
    await scroll(page, top - 650);
    await page.waitForTimeout(900);
    const sample = selector === '[data-motion="route"]' ? '[data-motion-path]' : selector;
    const revealed = await position(page, sample);
    expect(revealed.opacity).toBe(1);
    expect(revealed.y).toBe(0);
    if (sample === '[data-motion-path]') expect(revealed.dash).toBe(0);
    await scroll(page, 0);
    near(await position(page, sample), revealed);
    await scroll(page, top - 650);
    near(await position(page, sample), revealed);
  }
  await scroll(page, 0);
  near(await position(page, '.hero-photo'), hero);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  for (const selector of ['.service-tile']) {
    const state = await position(page, selector);
    expect(state.opacity).toBe(1);
    expect(state.y).toBe(0);
  }
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await page.screenshot({ path: 'docs/motion/once-mobile.png' });
});

test('content visible on arrival is never pulled back to an animation start', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Both elements sit in the first screen: the first service row and the route stops.
  for (const [route, selector] of [
    ['/services', '.service-tile'],
    ['/', '[data-motion-marker]'],
  ] as const) {
    await page.goto(route);
    await expect(page.locator(selector).first()).toBeInViewport();
    // Sample from page load until well after the motion script has started.
    const samples = await page.evaluate(async (target) => {
      const element = document.querySelector(target)!;
      const seen: [number, number][] = [];
      for (let i = 0; i < 25; i++) {
        const style = getComputedStyle(element);
        seen.push([Number(style.opacity), new DOMMatrix(style.transform).m42]);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      return seen;
    }, selector);
    await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'ready');
    expect(
      samples.every(([opacity, y]) => opacity === 1 && y === 0),
      `${route} ${selector}`,
    ).toBe(true);
  }
  // Content further down still waits for the visitor to scroll to it.
  await ready(page, '/services');
  const below = page.locator('.steps [data-motion-item]').first();
  await expect(below).not.toBeInViewport();
  expect(Number(await below.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1);
  await below.scrollIntoViewIfNeeded();
  await expect.poll(() => below.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
});

test('public pages preload the heading font and cross-fade; the admin does not', async ({
  page,
  request,
}) => {
  await page.goto('/about');
  const preload = page.locator('link[rel="preload"][as="font"]');
  await expect(preload).toHaveCount(1);
  const font = await request.get((await preload.getAttribute('href'))!);
  expect(font.status()).toBe(200);
  expect(font.headers()['content-type']).toContain('font/woff2');
  // The preloaded file is the one the page's headings actually use.
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.endsWith('.woff2'))
        .map((entry) => new URL(entry.name).pathname),
    ),
  ).toEqual([await preload.getAttribute('href')]);
  expect(await page.content()).toContain('@view-transition');
  expect(await (await request.get('/admin/login')).text()).not.toContain('@view-transition');
});

test('animations start automatically with reduced motion and old disabled preference', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => sessionStorage.setItem('lintas-scroll-motion', 'disabled'));
  await page.setViewportSize({ width: 1920, height: 917 });
  await ready(page);
  await expect(page.getByRole('button', { name: /animasi/i })).toHaveCount(0);
  await page.waitForTimeout(1900);
  expect((await position(page, '.hero-photo')).scale).toBeCloseTo(1.15, 2);
  const top = await documentTop(page, '.service-tile');
  await scroll(page, top - 650);
  await page.waitForTimeout(500);
  expect((await position(page, '.service-tile')).opacity).toBe(1);
  await scroll(page, 0);
  expect((await position(page, '.service-tile')).opacity).toBe(1);
  await page.screenshot({ path: 'docs/motion/automatic-desktop.png' });
});

test('no JavaScript keeps all pages visible; hash links and contact inputs remain usable', async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  for (const route of routes) {
    await staticPage.goto(`http://localhost:4322${route}`);
    await expect(staticPage.locator('h1')).toBeVisible();
    await expect(staticPage.locator('[data-motion-control], .pin-spacer')).toHaveCount(0);
    expect(
      await staticPage
        .locator('[data-motion-item]')
        .evaluateAll((elements) => elements.every((el) => getComputedStyle(el).opacity === '1')),
    ).toBe(true);
  }
  await context.close();
  await ready(page, '/#domestic-trucking');
  await expect(page.locator('#domestic-trucking')).toBeInViewport();
  await ready(page, '/contact');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const input = page.locator('[name="fullName"]');
  await input.fill('One-time animation');
  await scroll(page, 700);
  await expect(input).toHaveValue('One-time animation');
  expect(
    await input.evaluate((el) => {
      for (let parent: Element | null = el; parent; parent = parent.parentElement)
        if (getComputedStyle(parent).transform !== 'none') return false;
      return true;
    }),
  ).toBe(true);
});

test('empty, changing and oversized CMS content remains usable', async ({ page }) => {
  const db = new Database(process.env.DATABASE_PATH!);
  const records = db
    .prepare('SELECT id, published, short_description FROM services ORDER BY sort_order, id')
    .all() as {
    id: number;
    published: number;
    short_description: string;
  }[];
  try {
    db.prepare('UPDATE services SET published=0').run();
    await ready(page);
    await expect(page.locator('.services-grid [data-motion-item]')).toHaveCount(0);
    for (const count of [1, 2, 3]) {
      db.prepare('UPDATE services SET published=1 WHERE id=?').run(records[count - 1].id);
      await ready(page);
      await expect(page.locator('.services-grid [data-motion-item]')).toHaveCount(count);
    }
    db.prepare('UPDATE services SET short_description=? WHERE id=?').run(
      'Deskripsi layanan panjang. '.repeat(120),
      records[0].id,
    );
    await ready(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.locator('.services-grid .service-tile a').first().click();
    await expect(page).toHaveURL(/\/contact\?service=/);
  } finally {
    for (const row of records)
      db.prepare('UPDATE services SET published=?, short_description=? WHERE id=?').run(
        row.published,
        row.short_description,
        row.id,
      );
    db.close();
  }
});
