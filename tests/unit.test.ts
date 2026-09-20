import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes, createHmac } from 'node:crypto';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import sharp from 'sharp';
const dir = mkdtempSync(path.join(tmpdir(), 'lintas-unit-'));
process.env.DATA_DIR = dir;
process.env.DATABASE_PATH = path.join(dir, 'app.db');
process.env.BETTER_AUTH_SECRET = randomBytes(48).toString('hex');
const { db, sqlite } = await import('../src/db');
migrate(db, { migrationsFolder: './drizzle' });
const { contentInput, imagePath, webUrl, quoteInput } = await import('../src/lib/validation');
const { formToken, verifyToken, allowRequest } = await import('../src/lib/spam');
const { mediaFile, saveImage } = await import('../src/lib/media');
after(() => {
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});
test('fresh migration enables foreign keys and WAL, and is repeatable', () => {
  assert.equal(sqlite.pragma('foreign_keys', { simple: true }), 1);
  assert.equal(sqlite.pragma('journal_mode', { simple: true }), 'wal');
  assert.equal(sqlite.pragma('busy_timeout', { simple: true }), 5000);
  migrate(db, { migrationsFolder: './drizzle' });
  assert.throws(() =>
    sqlite
      .prepare(
        'INSERT INTO session (id,expires_at,token,created_at,updated_at,user_id) VALUES (?,?,?,?,?,?)',
      )
      .run('x', 1, 'x', 1, 1, 'missing'),
  );
});
test('reject unsafe URLs, slugs and media paths', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,unsafe', '//evil.example'])
    assert.equal(webUrl.safeParse(url).success, false);
  for (const p of [
    '/media/../../app.db',
    '/images/../secret.jpg',
    'https://evil.example/x.jpg',
    '/images/a.svg" onload="alert(1)',
  ])
    assert.equal(imagePath.safeParse(p).success, false);
  assert.throws(() => mediaFile('../app.db'));
  assert.equal(
    contentInput.safeParse({
      collection: 'services',
      title: 'Test',
      slug: '../bad',
      published: true,
      sortOrder: 0,
    }).success,
    false,
  );
  assert.equal(
    contentInput.safeParse({
      collection: 'fleet',
      title: 'Test',
      slug: 'test',
      published: true,
      sortOrder: 0,
    }).success,
    false,
  );
});
test('quotation input requires genuine contact and route fields', () => {
  assert.equal(quoteInput.safeParse({ fullName: 'A', email: 'invalid' }).success, false);
  assert.equal(
    quoteInput.safeParse({
      fullName: 'Test User',
      company: 'PT Test',
      phone: '+62 812345678',
      email: 'test@example.com',
      pickup: 'Jakarta',
      destination: 'Bandung',
      cargo: 'Pallet',
      weight: '1 ton',
      token: 'token',
    }).success,
    true,
  );
});
test('signed form tokens reject rushed, expired and forged submissions', () => {
  assert.equal(verifyToken(formToken()), false);
  const token = (age: number) => {
    const p = `${Date.now() - age}.test`;
    return `${p}.${createHmac('sha256', process.env.BETTER_AUTH_SECRET!).update(p).digest('hex')}`;
  };
  assert.equal(verifyToken(token(3000)), true);
  assert.equal(verifyToken(token(3 * 60 * 60 * 1000)), false);
  assert.equal(verifyToken(token(3000).replace(/.$/, 'z')), false);
  assert.equal(verifyToken('invalid'), false);
});
test('rate limiter persists counters and rejects requests over threshold', () => {
  assert.equal(allowRequest('unit-limit', 2, 60000), true);
  assert.equal(allowRequest('unit-limit', 2, 60000), true);
  assert.equal(allowRequest('unit-limit', 2, 60000), false);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM rate_limit').get() !== undefined, true);
});
test('uploads validate decoded type, size and category, and generate safe WebP', async () => {
  await assert.rejects(() =>
    saveImage(new File(['<svg/>'], 'bad.png', { type: 'image/png' }), 'fleet'),
  );
  await assert.rejects(() =>
    saveImage(new File(['test'], 'test.svg', { type: 'image/svg+xml' }), 'fleet'),
  );
  await assert.rejects(() =>
    saveImage(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
      'fleet',
    ),
  );
  await assert.rejects(() =>
    saveImage(new File(['test'], 'test.png', { type: 'image/png' }), '../../'),
  );
  const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#142b28' } })
    .png()
    .toBuffer();
  const result = await saveImage(
    new File([new Uint8Array(png)], '../../fake.jpg', { type: 'image/png' }),
    'fleet',
  );
  assert.match(result, /^\/media\/fleet\/[a-f0-9-]+\.webp$/);
  const meta = await sharp(mediaFile(result.slice('/media/'.length))).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM media').get() !== undefined, true);
});
