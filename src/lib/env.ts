import path from 'node:path';
export const dataDir = path.resolve(process.env.DATA_DIR || './data');
export const databasePath = path.resolve(process.env.DATABASE_PATH || path.join(dataDir, 'app.db'));
export const uploadsDir = path.join(dataDir, 'uploads');
export const origin = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:4321').origin;
export function getSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      'Set BETTER_AUTH_SECRET to a random value of at least 32 characters. See .env.example.',
    );
  return secret;
}
