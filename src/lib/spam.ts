import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { sqlite } from '../db';
import { getSecret } from './env';
export function formToken() {
  const payload = `${Date.now()}.${randomUUID()}`;
  return `${payload}.${createHmac('sha256', getSecret()).update(payload).digest('hex')}`;
}
export function verifyToken(token: string) {
  const [time, nonce, signature] = token.split('.');
  if (!time || !nonce || !signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', getSecret()).update(`${time}.${nonce}`).digest();
  const age = Date.now() - Number(time);
  return (
    timingSafeEqual(expected, Buffer.from(signature, 'hex')) &&
    age >= 2000 &&
    age < 2 * 60 * 60 * 1000
  );
}
export function allowRequest(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hashed = createHmac('sha256', getSecret()).update(key).digest('hex');
  return sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM rate_limit WHERE expires_at < ?').run(now);
    const row = sqlite.prepare('SELECT count FROM rate_limit WHERE key = ?').get(hashed) as
      { count: number } | undefined;
    if (row && row.count >= limit) return false;
    sqlite
      .prepare(
        'INSERT INTO rate_limit (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',
      )
      .run(hashed, now + windowMs);
    return true;
  })();
}
