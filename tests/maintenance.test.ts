import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Database from 'better-sqlite3';
import sharp from 'sharp';
test('maintenance: seed repeatability, admin recovery, media pruning, paired backup restore', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'lintas-maintenance-'));
  const data = path.join(root, 'data');
  const backup = path.join(root, 'backups');
  const env = {
    ...process.env,
    DATA_DIR: data,
    DATABASE_PATH: path.join(data, 'app.db'),
    BETTER_AUTH_SECRET: randomBytes(48).toString('hex'),
    BETTER_AUTH_URL: 'http://localhost:4321',
    ADMIN_EMAIL: 'maintenance@example.com',
    ADMIN_PASSWORD: randomBytes(24).toString('hex'),
    BACKUP_DIR: backup,
    NODE_ENV: 'test',
  };
  const run = (script: string) =>
    execFileSync(process.execPath, ['--import', 'tsx', `scripts/${script}.ts`], {
      env,
      encoding: 'utf8',
    });
  try {
    run('migrate');
    run('seed');
    run('seed');
    run('bootstrap');
    let db = new Database(env.DATABASE_PATH);
    assert.equal((db.prepare('SELECT count(*) AS n FROM services').get() as { n: number }).n, 6);
    const admin = db.prepare('SELECT id FROM user WHERE email=?').get(env.ADMIN_EMAIL) as {
      id: string;
    };
    db.prepare(
      'INSERT INTO session(id,expires_at,token,created_at,updated_at,user_id) VALUES (?,?,?,?,?,?)',
    ).run('recovery-test', Date.now() + 60000, 'recovery-test', Date.now(), Date.now(), admin.id);
    db.close();
    env.ADMIN_PASSWORD = randomBytes(24).toString('hex');
    run('reset-admin');
    db = new Database(env.DATABASE_PATH);
    assert.equal((db.prepare('SELECT count(*) AS n FROM session').get() as { n: number }).n, 0);
    const image = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#142b28' },
    })
      .webp()
      .toBuffer();
    const folder = path.join(data, 'uploads/general');
    mkdirSync(folder, { recursive: true });
    for (const id of [
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    ]) {
      writeFileSync(path.join(folder, `${id}.webp`), image);
      db.prepare(
        'INSERT INTO media (id,path,mime,size,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      ).run(
        id,
        `/media/general/${id}.webp`,
        'image/webp',
        image.length,
        Date.now() - 2 * 86400000,
        Date.now(),
      );
    }
    db.prepare('UPDATE site_settings SET logo=? WHERE id=1').run(
      '/media/general/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp',
    );
    db.close();
    run('prune');
    assert.deepEqual(readdirSync(folder), ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp']);
    run('backup');
    const snapshot = path.join(backup, readdirSync(backup)[0]);
    assert.ok(readFileSync(path.join(snapshot, 'manifest.json'), 'utf8').includes('app.db'));
    const restored = path.join(root, 'restored');
    cpSync(snapshot, restored, { recursive: true });
    const restoredDb = new Database(path.join(restored, 'app.db'));
    assert.equal(restoredDb.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(
      (restoredDb.prepare('SELECT count(*) AS n FROM services').get() as { n: number }).n,
      6,
    );
    const logo = restoredDb.prepare('SELECT logo FROM site_settings').get() as { logo: string };
    assert.equal(
      readFileSync(path.join(restored, 'uploads', logo.logo.slice('/media/'.length))).length,
      image.length,
    );
    restoredDb.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
