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
const { contentInput, imagePath, webUrl, quoteInput, settingsInput } =
  await import('../src/lib/validation');
const { localePath, stripLocale } = await import('../src/i18n');
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
      collection: 'projects',
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
      serviceType: 'container-transportation',
      containerType: '40ft',
      token: 'token',
    }).success,
    true,
  );
  const quote = {
    fullName: 'Test User',
    company: 'PT Test',
    phone: '+62 812345678',
    email: 'test@example.com',
    pickup: 'Jakarta',
    destination: 'Bandung',
    serviceType: 'container-transportation',
    token: 'token',
  };
  assert.equal(quoteInput.safeParse({ ...quote, containerType: '45ft' }).success, false);
  assert.equal(quoteInput.safeParse(quote).success, false);
});
test('locale codes are reserved slugs and English content fields are optional', () => {
  const record = { collection: 'articles', title: 'Test', published: true, sortOrder: 0 };
  for (const slug of ['id', 'en'])
    assert.equal(contentInput.safeParse({ ...record, slug }).success, false);
  const parsed = contentInput.parse({ ...record, slug: 'test' });
  assert.equal(parsed.titleEn, '');
  assert.equal(contentInput.parse({ ...record, slug: 'test', titleEn: 'Hello' }).titleEn, 'Hello');
  assert.equal(imagePath.safeParse(`/media/articles/${'a'.repeat(8)}.webp`).success, true);
});
test('settings accept blank contact details but reject malformed ones', () => {
  const settings = {
    companyName: 'Genesis Trans Indonesia',
    legalName: 'PT Genesis Trans Indonesia',
    tagline: 'Your Trusted Partner',
    shortDescription: 'Angkutan kontainer 20 dan 40 feet.',
    about: 'Profil perusahaan untuk pengujian.',
    vision: 'Visi perusahaan.',
    mission: 'Misi perusahaan.',
    established: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    mapsUrl: '',
    instagram: '',
    linkedin: '',
    ctaText: 'Minta penawaran',
    logo: '',
    favicon: '',
    credentials: '',
    statistics: [],
  };
  assert.equal(settingsInput.safeParse(settings).success, true);
  assert.equal(settingsInput.safeParse({ ...settings, whatsapp: '0812-abc' }).success, false);
  assert.equal(settingsInput.safeParse({ ...settings, email: 'not-an-email' }).success, false);
  assert.equal(settingsInput.safeParse({ ...settings, established: '20' }).success, false);
  assert.equal(
    settingsInput.safeParse({ ...settings, whatsapp: '628123456789', established: '2015' }).success,
    true,
  );
});
test('locale paths: Indonesian is unprefixed and English lives under /en', () => {
  assert.equal(localePath('id', '/about'), '/about');
  assert.equal(localePath('en', '/about'), '/en/about');
  assert.equal(localePath('en', '/'), '/en');
  assert.deepEqual(stripLocale('/en'), { locale: 'en', path: '/' });
  assert.deepEqual(stripLocale('/en/'), { locale: 'en', path: '/' });
  assert.deepEqual(stripLocale('/en/articles/berita/'), { locale: 'en', path: '/articles/berita' });
  assert.deepEqual(stripLocale('/services'), { locale: 'id', path: '/services' });
  // "/english" is an ordinary Indonesian path, not the English locale.
  assert.deepEqual(stripLocale('/english'), { locale: 'id', path: '/english' });
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
    saveImage(new File(['<svg/>'], 'bad.png', { type: 'image/png' }), 'services'),
  );
  await assert.rejects(() =>
    saveImage(new File(['test'], 'test.svg', { type: 'image/svg+xml' }), 'services'),
  );
  await assert.rejects(() =>
    saveImage(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
      'services',
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
    'services',
  );
  assert.match(result, /^\/media\/services\/[a-f0-9-]+\.webp$/);
  const meta = await sharp(mediaFile(result.slice('/media/'.length))).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM media').get() !== undefined, true);
});
test('visitor location: Indonesian addresses, foreign addresses and addresses without a location', async () => {
  const { isIndonesianIp, preferredLanguage, detectLocale } = await import('../src/lib/geo');
  const { default: ranges } = await import('../src/lib/geo/indonesia.json');
  const dotted = (value: number) =>
    [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.');
  // First and last address of every tenth allocated block, straight from the table.
  for (let i = 0; i < ranges.v4.length; i += 20) {
    assert.equal(isIndonesianIp(dotted(ranges.v4[i])), true);
    assert.equal(isIndonesianIp(dotted(ranges.v4[i + 1])), true);
  }
  const prefix = String(ranges.v6[0]).match(/.{4}/g)!.join(':');
  assert.equal(isIndonesianIp(`${prefix}::1`), true);
  assert.equal(isIndonesianIp(`${prefix}:0:0:0:abcd`), true);
  assert.equal(isIndonesianIp(`::ffff:${dotted(ranges.v4[0])}`), true);
  // Public addresses outside Indonesia.
  for (const foreign of ['8.8.8.8', '1.1.1.1', '2001:4860:4860::8888', '::ffff:8.8.8.8'])
    assert.equal(isIndonesianIp(foreign), false, foreign);
  // Loopback, private networks and junk say nothing about location.
  for (const unknown of [
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.9',
    '192.168.1.20',
    '100.64.0.1',
    '169.254.1.1',
    '::1',
    'fe80::1%en0',
    'fd00::1',
    '::ffff:192.168.0.1',
    'unknown',
    '999.1.1.1',
    '1.2.3',
    '2001:::1',
    '',
  ])
    assert.equal(isIndonesianIp(unknown), undefined, unknown);

  assert.equal(preferredLanguage('id-ID,id;q=0.9,en;q=0.8'), 'id');
  assert.equal(preferredLanguage('en-US,en;q=0.9,id;q=0.8'), 'en');
  assert.equal(preferredLanguage('en;q=0.5, id;q=0.9'), 'id');
  assert.equal(preferredLanguage('ja,fr;q=0.8'), 'en');
  assert.equal(preferredLanguage('id;q=0, de'), 'en');
  assert.equal(preferredLanguage(''), undefined);
  assert.equal(preferredLanguage(null), undefined);

  // Location wins over the browser language whenever the address has one.
  assert.equal(detectLocale({ address: dotted(ranges.v4[0]), acceptLanguage: 'en-US' }), 'id');
  assert.equal(detectLocale({ address: '8.8.8.8', acceptLanguage: 'id-ID' }), 'en');
  // Without a location the browser language decides; with neither, the site default.
  assert.equal(detectLocale({ address: '127.0.0.1', acceptLanguage: 'en-US' }), 'en');
  assert.equal(detectLocale({ address: '127.0.0.1', acceptLanguage: 'id-ID' }), 'id');
  assert.equal(detectLocale({ address: 'unknown', acceptLanguage: null }), 'id');
});
test('page text: every wording is editable once, edits overlay the defaults, blanks fall back', async () => {
  const { defaults, flattenText, applyText } = await import('../src/i18n');
  const { copyPages, copyKeys, technicalKeys } = await import('../src/lib/copy-fields');
  const { copyInput } = await import('../src/lib/validation');
  const { ui } = await import('../src/lib/copy');
  const { siteCopy } = await import('../src/db/schema');
  // The admin screen lists exactly the texts the dictionaries contain, in both languages.
  const listed = copyPages.flatMap((page) =>
    page.sections.flatMap((section) => section.fields.map((field) => field.key)),
  );
  assert.equal(listed.length, copyKeys.size, 'a text is listed twice');
  for (const locale of ['id', 'en'] as const)
    assert.deepEqual(
      Object.keys(flattenText(defaults(locale)))
        .filter((key) => !technicalKeys.includes(key))
        .sort(),
      [...copyKeys].sort(),
    );

  const edited = applyText(defaults('id'), {
    'home.h1': 'Judul baru',
    'route.stops.1.title': 'Truk',
    'home.title': '   ',
    'not.a.key': 'ignored',
    'route.stops': 'ignored',
  });
  assert.equal(edited.home.h1, 'Judul baru');
  assert.equal(edited.route.stops[1].title, 'Truk');
  assert.equal(edited.home.title, defaults('id').home.title);
  assert.equal(edited.route.stops.length, 4);
  assert.notEqual(defaults('id').home.h1, 'Judul baru', 'defaults must not be mutated');

  const entry = { key: 'home.h1', id: 'Judul', en: 'Heading' };
  assert.equal(copyInput.safeParse({ entries: [entry] }).success, true);
  assert.equal(copyInput.safeParse({ entries: [] }).success, false);
  assert.equal(copyInput.safeParse({ entries: [{ ...entry, key: 'htmlLang' }] }).success, false);
  assert.equal(copyInput.safeParse({ entries: [{ ...entry, key: 'nope' }] }).success, false);
  assert.equal(
    copyInput.safeParse({ entries: [{ ...entry, en: 'x'.repeat(2001) }] }).success,
    false,
  );

  // The reader the pages use: defaults first, then saved edits, per language.
  assert.equal(ui('id').home.h1, defaults('id').home.h1);
  db.insert(siteCopy).values({ key: 'home.h1', id: 'Judul uji', en: '' }).run();
  assert.equal(ui('id').home.h1, 'Judul uji');
  assert.equal(ui('en').home.h1, defaults('en').home.h1);
  db.update(siteCopy)
    .set({ id: '', updatedAt: new Date(Date.now() + 1000) })
    .run();
  assert.equal(ui('id').home.h1, defaults('id').home.h1);
});
