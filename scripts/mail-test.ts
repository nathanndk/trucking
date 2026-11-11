// Sends one test email to QUOTE_MAIL_TO with the configured SMTP account and reports the result.
// Run after filling SMTP_* and MAIL_FROM in .env: pnpm mail:test
import nodemailer from 'nodemailer';
import { mailSettings } from '../src/lib/env';
const settings = mailSettings();
if (!settings.host || !settings.from)
  throw new Error(
    'Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM in .env first. See .env.example.',
  );
const transport = nodemailer.createTransport({
  host: settings.host,
  port: settings.port,
  secure: settings.secure,
  auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
});
console.log(
  `Connecting to ${settings.host}:${settings.port} (${settings.secure ? 'TLS' : 'STARTTLS'})…`,
);
await transport.verify();
const info = await transport.sendMail({
  from: settings.from,
  to: settings.quoteTo,
  subject: 'Tes email website Genesis Trans',
  text: 'Email ini dikirim oleh pnpm mail:test. Jika sampai di kotak masuk, permintaan penawaran dari website juga akan terkirim ke alamat ini.',
});
console.log(
  `Accepted by the server for ${info.accepted.join(', ')} (message id ${info.messageId}).`,
);
console.log('Check the inbox (and the spam folder) of that address.');
