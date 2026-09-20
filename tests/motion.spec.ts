import { test, expect, type Page } from '@playwright/test';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import { mkdirSync, copyFileSync } from 'node:fs';

const routes = ['/', '/about', '/services', '/fleet', '/coverage', '/projects', '/contact'];
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

test('desktop scenes pin and scroll progress reverses to the same visual state', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  await expect(page.locator('[data-motion-pinned]')).toHaveCount(2);
  const heroTop = await documentTop(page, '.pin-spacer');
  await scroll(page, heroTop + 300);
  const first = await position(page, '.hero-photo');
  await page.waitForTimeout(1500);
  const before = await sharp(await page.screenshot())
    .removeAlpha()
    .raw()
    .toBuffer();
  await scroll(page, heroTop + 650);
  expect((await position(page, '.hero-photo')).scale).toBeGreaterThan(first.scale + 0.03);
  expect(Math.abs((await page.locator('[data-motion="hero"]').boundingBox())!.y)).toBeLessThan(1);
  await scroll(page, heroTop + 300);
  near(await position(page, '.hero-photo'), first);
  const after = await sharp(await page.screenshot())
    .removeAlpha()
    .raw()
    .toBuffer();
  expect(before.length).toBe(after.length);
  const meanDifference =
    before.reduce((sum, value, i) => sum + Math.abs(value - after[i]), 0) / before.length;
  expect(meanDifference, 'round-trip pixel difference (0–255)').toBeLessThan(1);
  mkdirSync('docs/motion', { recursive: true });
  await page.screenshot({ path: 'docs/motion/hero-desktop.png' });
  const fleetStart = await documentTop(page, '#armada');
  await scroll(page, fleetStart + 350);
  const fleet = await position(page, '#armada [data-motion-item]');
  await scroll(page, fleetStart + 850);
  expect(Math.abs((await page.locator('#armada').boundingBox())!.y)).toBeLessThan(1);
  expect((await position(page, '#armada [data-motion-item]')).opacity).toBeGreaterThan(
    fleet.opacity,
  );
  await page.screenshot({ path: 'docs/motion/fleet-desktop.png' });
  await scroll(page, fleetStart + 350);
  near(await position(page, '#armada [data-motion-item]'), fleet);
  const mapTop = await documentTop(page, '[data-motion="route"]');
  await scroll(page, mapTop - 650);
  const route = await position(page, '[data-motion-path]');
  await scroll(page, mapTop - 300);
  expect((await position(page, '[data-motion-path]')).dash).toBeLessThan(route.dash);
  await scroll(page, mapTop - 650);
  near(await position(page, '[data-motion-path]'), route);
});

for (const width of [375, 768, 1440]) {
  test(`all seven pages remain usable during fast two-way scroll at ${width}px`, async ({
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

test('responsive pins rebuild cleanly and mobile travel stays within limits', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page);
  for (const [width, height, count] of [
    [375, 812, 0],
    [1440, 650, 0],
    [1440, 1000, 2],
    [768, 1024, 0],
    [1440, 1000, 2],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    await expect(page.locator('.pin-spacer')).toHaveCount(count);
    await expect(page.locator('.pin-spacer .pin-spacer')).toHaveCount(0);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  const card = await position(page, '.service-tile');
  expect(card.y).toBeLessThanOrEqual(24);
  await scroll(page, 1200);
  expect((await position(page, '.hero-photo')).scale).toBeLessThanOrEqual(1.05);
});

for (const mode of ['reduced', 'no-js'] as const) {
  test(`${mode}: all public pages keep static content and links`, async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: mode !== 'no-js',
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    for (const route of routes) {
      await page.goto(`http://localhost:4322${route}`);
      if (mode === 'reduced')
        await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'static');
      await expect(page.locator('.pin-spacer')).toHaveCount(0);
      expect(
        await page
          .locator('[data-motion], [data-motion-item]')
          .evaluateAll((elements) =>
            elements.every(
              (el) =>
                getComputedStyle(el).opacity === '1' && getComputedStyle(el).transform === 'none',
            ),
          ),
      ).toBe(true);
      await expect(page.locator('h1')).toBeVisible();
    }
    await page.locator('[name="fullName"]').fill('Keyboard visitor');
    await expect(page.locator('[name="fullName"]')).toHaveValue('Keyboard visitor');
    await context.close();
  });
}

test('hash links, keyboard focus, live reduced motion and stable contact form', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await ready(page, '/#wingbox');
  await expect(page.locator('#wingbox')).toBeInViewport();
  await expect(page.locator('#wingbox')).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'static');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page, '/contact');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const input = page.locator('[name="fullName"]');
  await input.fill('Scroll test');
  await scroll(page, 700);
  expect(
    await input.evaluate((el) => {
      for (let parent: Element | null = el; parent; parent = parent.parentElement)
        if (getComputedStyle(parent).transform !== 'none') return false;
      return true;
    }),
  ).toBe(true);
  await expect(input).toHaveValue('Scroll test');
});

test('empty and changed CMS card counts initialize without phantom pins', async ({ page }) => {
  const db = new Database(process.env.DATABASE_PATH!);
  const records = db.prepare('SELECT id, published FROM fleet').all() as {
    id: number;
    published: number;
  }[];
  await page.setViewportSize({ width: 1440, height: 1000 });
  try {
    db.prepare('UPDATE fleet SET published=0').run();
    await ready(page);
    await expect(page.locator('[data-motion-pinned="fleet"]')).toHaveCount(0);
    for (const count of [1, 2, 3]) {
      db.prepare('UPDATE fleet SET published=1 WHERE id=?').run(records[count - 1].id);
      await ready(page);
      await expect(page.locator('#armada [data-motion-item]')).toHaveCount(count);
      await expect(page.locator('[data-motion-pinned="fleet"]')).toHaveCount(1);
    }
  } finally {
    for (const record of records)
      db.prepare('UPDATE fleet SET published=? WHERE id=?').run(record.published, record.id);
    db.close();
  }
});

test('record a continuous down-up motion preview', async ({ browser }) => {
  test.setTimeout(60000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: { dir: 'test-results/motion-video', size: { width: 1440, height: 1000 } },
  });
  const page = await context.newPage();
  await page.goto('http://localhost:4322');
  await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'ready');
  const end = await documentTop(page, '[data-motion="route"]');
  for (let i = 0; i <= 200; i++) {
    const progress = i <= 100 ? i / 100 : (200 - i) / 100;
    await page.evaluate((y) => window.scrollTo(0, y), end * progress);
    await page.waitForTimeout(55);
  }
  await page.waitForTimeout(700);
  const video = page.video()!;
  await context.close();
  mkdirSync('docs/motion', { recursive: true });
  copyFileSync(await video.path(), 'docs/motion/scroll-down-up.webm');
});

test('failed animation chunk keeps the server-rendered page usable', async ({ page }) => {
  await page.route('**/_astro/ScrollTrigger*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('main')).toHaveAttribute('data-motion-state', 'static');
  await expect(page.locator('.pin-spacer')).toHaveCount(0);
  await expect(page.locator('h1')).toBeVisible();
  await page.locator('.hero-actions a').first().click();
  await expect(page).toHaveURL(/\/contact$/);
});

test('oversized CMS scenes fall back to flowing cards', async ({ page }) => {
  const db = new Database(process.env.DATABASE_PATH!);
  const record = db
    .prepare(
      'SELECT id, short_description FROM fleet WHERE published=1 ORDER BY sort_order LIMIT 1',
    )
    .get() as { id: number; short_description: string };
  try {
    db.prepare('UPDATE fleet SET short_description=? WHERE id=?').run(
      'Deskripsi armada yang panjang. '.repeat(120),
      record.id,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ready(page);
    await expect(page.locator('[data-motion-pinned="fleet"]')).toHaveCount(0);
    expect((await page.locator('#armada').boundingBox())!.height).toBeGreaterThan(1000);
    await page.locator('#armada .capacity a').first().click();
    await expect(page).toHaveURL(/\/contact\?vehicle=/);
  } finally {
    db.prepare('UPDATE fleet SET short_description=? WHERE id=?').run(
      record.short_description,
      record.id,
    );
    db.close();
  }
});
