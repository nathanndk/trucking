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
/**
 * Outgoing email for quote requests. SMTP_HOST turns sending on; MAIL_TRANSPORT=json writes
 * each message to MAIL_OUTBOX instead (local runs and tests). With neither, nothing is sent and
 * requests are only stored. Read on each call so tests and scripts can change the environment.
 */
export function mailSettings() {
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || '';
  return {
    transport: process.env.MAIL_TRANSPORT === 'json' ? ('json' as const) : ('smtp' as const),
    outbox: path.resolve(process.env.MAIL_OUTBOX || path.join(dataDir, 'outbox')),
    host: process.env.SMTP_HOST || '',
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    user,
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || user,
    quoteTo: process.env.QUOTE_MAIL_TO || 'info@genesistransindo.com',
  };
}
