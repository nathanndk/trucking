import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { origin, getSecret } from './env';
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'sqlite', schema }),
  baseURL: origin,
  secret: getSecret(),
  trustedOrigins: [origin],
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  user: { additionalFields: { role: { type: 'string', defaultValue: 'admin', input: false } } },
  session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 30 },
  advanced: {
    useSecureCookies: origin.startsWith('https:'),
    ipAddress: { ipAddressHeaders: process.env.TRUST_PROXY === 'true' ? ['x-real-ip'] : [] },
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
});
