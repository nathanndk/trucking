import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.MOCKUP_BASE_URL || 'http://127.0.0.1:4322';
const outputRoot = path.resolve(process.env.MOCKUP_OUTPUT || 'docs/mockups-client');
const chromiumPath = process.env.CHROMIUM_PATH;

const publicPages = [
  ['home', '/'],
  ['about', '/about'],
  ['services', '/services'],
  ['fleet', '/fleet'],
  ['coverage', '/coverage'],
  ['projects', '/projects'],
  ['contact', '/contact'],
  ['404', '/page-not-found'],
];

const adminPages = [
  ['dashboard', '/admin'],
  ['services', '/admin/services'],
  ['fleet', '/admin/fleet'],
  ['coverage', '/admin/coverage'],
  ['projects', '/admin/projects'],
  ['clients', '/admin/clients'],
  ['inquiries', '/admin/inquiries'],
  ['settings', '/admin/settings'],
];

const viewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['mobile', { width: 390, height: 844 }],
];

async function waitForServer(timeout = 60_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseURL}/admin/login`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Server did not become ready at ${baseURL}`);
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    for (const image of images) {
      image.loading = 'eager';
      try {
        await image.decode();
      } catch {}
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.addStyleTag({
    content:
      '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}',
  });
  await page.waitForTimeout(100);
}

async function capture(page, group, name, route, viewportName) {
  const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
  if (!response || (response.status() >= 400 && name !== '404'))
    throw new Error(`${route} returned ${response?.status() ?? 'no response'}`);
  await settle(page);
  const file = path.join(outputRoot, viewportName, `${group}-${name}.png`);
  const temporaryFile = `${file}.full.png`;
  const viewport = page.viewportSize();
  await page.screenshot({ path: temporaryFile, fullPage: true });
  const header = await readFile(temporaryFile);
  const imageWidth = header.readUInt32BE(16);
  const imageHeight = header.readUInt32BE(20);
  execFileSync('magick', [
    temporaryFile,
    '-crop',
    `${Math.min(viewport.width, imageWidth)}x${imageHeight}+0+0`,
    '+repage',
    file,
  ]);
  await rm(temporaryFile);
  console.log(`${viewportName}: ${route} -> ${path.relative(process.cwd(), file)}`);
}

await rm(outputRoot, { recursive: true, force: true });
for (const [viewportName] of viewports)
  await mkdir(path.join(outputRoot, viewportName), { recursive: true });

const server = spawn(process.execPath, ['tests/start-server.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test' },
});

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: chromiumPath || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  for (const [viewportName, viewport] of viewports) {
    const publicContext = await browser.newContext({
      viewport,
      colorScheme: 'light',
      reducedMotion: 'reduce',
      locale: 'id-ID',
    });
    const publicPage = await publicContext.newPage();
    for (const [name, route] of publicPages)
      await capture(publicPage, 'public', name, route, viewportName);
    await capture(publicPage, 'admin', 'login', '/admin/login', viewportName);
    await publicContext.close();

    const adminContext = await browser.newContext({
      viewport,
      colorScheme: 'light',
      reducedMotion: 'reduce',
      locale: 'id-ID',
    });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(`${baseURL}/admin/login`, { waitUntil: 'networkidle' });
    await adminPage.getByLabel('Email address').fill(process.env.ADMIN_EMAIL);
    await adminPage.getByLabel('Password', { exact: true }).fill(process.env.ADMIN_PASSWORD);
    await adminPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await adminPage.waitForURL(`${baseURL}/admin`);
    for (const [name, route] of adminPages)
      await capture(adminPage, 'admin', name, route, viewportName);
    await adminContext.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}

console.log(`Captured ${viewports.length * (publicPages.length + adminPages.length + 1)} mockups.`);
