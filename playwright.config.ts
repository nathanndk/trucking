import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = process.env.LINTAS_TEST_DIR || mkdtempSync(path.join(tmpdir(), 'lintas-e2e-'));
if (!process.env.LINTAS_TEST_DIR)
  Object.assign(process.env, {
    LINTAS_TEST_DIR: directory,
    DATA_DIR: directory,
    DATABASE_PATH: path.join(directory, 'app.db'),
    BETTER_AUTH_URL: 'http://localhost:4322',
    BETTER_AUTH_SECRET: randomBytes(48).toString('hex'),
    ADMIN_EMAIL: 'admin@e2e.example',
    ADMIN_PASSWORD: randomBytes(24).toString('base64url'),
    ADMIN_NAME: 'Test Administrator',
    HOST: '127.0.0.1',
    PORT: '4322',
    TRUST_PROXY: 'false',
    ASTRO_TELEMETRY_DISABLED: '1',
  });
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4322',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tests/start-server.mjs',
    url: 'http://localhost:4322/admin/login',
    reuseExistingServer: false,
    timeout: 60000,
  },
  globalTeardown: './tests/teardown.ts',
});
