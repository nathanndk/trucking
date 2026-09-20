import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { db, sqlite } from '../src/db';
import { user, account } from '../src/db/schema';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12)
  throw new Error('Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 12 characters.');
if (db.select().from(user).where(eq(user.email, email)).get())
  throw new Error('Admin already exists; bootstrap will not overwrite credentials.');
const id = randomUUID();
const hash = await hashPassword(password);
db.transaction((tx) => {
  tx.insert(user)
    .values({
      id,
      email,
      name: process.env.ADMIN_NAME || 'Website Administrator',
      role: 'admin',
      emailVerified: true,
    })
    .run();
  tx.insert(account)
    .values({
      id: randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: hash,
    })
    .run();
});
console.log('Admin created. Remove ADMIN_PASSWORD from the environment.');
sqlite.close();
