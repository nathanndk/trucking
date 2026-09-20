import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { db, sqlite } from '../src/db';
import { user, account, session } from '../src/db/schema';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error('Set ADMIN_EMAIL and a new ADMIN_PASSWORD of at least 12 characters.');
const admin = db.select().from(user).where(eq(user.email, email)).get();
if (!admin || admin.role !== 'admin') throw new Error('No administrator found for that email.');
const hash = await hashPassword(password);
db.transaction((tx) => {
  const result = tx
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, admin.id), eq(account.providerId, 'credential')))
    .run();
  if (!result.changes) throw new Error('No password account exists.');
  tx.delete(session).where(eq(session.userId, admin.id)).run();
});
console.log(
  'Admin password reset and all sessions revoked. Remove ADMIN_PASSWORD from the environment.',
);
sqlite.close();
