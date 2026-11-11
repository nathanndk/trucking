import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { fill, type Dictionary } from '../i18n';
import { mailSettings } from './env';

/** A stored quote request, as the emails need it. */
export type QuoteRequest = {
  fullName: string;
  company: string;
  phone: string;
  email: string;
  pickup: string;
  destination: string;
  containerType: '20ft' | '40ft';
  message: string;
};
export type Mail = {
  to: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
/** One line, no control characters: what may go into a header such as the subject. */
const oneLine = (value: string, max = 120) =>
  value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
/** Rows of label + value as plain text and as an HTML table. */
function rows(entries: [string, string][]) {
  return {
    text: entries.map(([label, value]) => `${label}: ${value}`).join('\n'),
    html:
      '<table cellpadding="6" style="border-collapse:collapse">' +
      entries
        .map(
          ([label, value]) =>
            `<tr><td style="color:#5a6b82;vertical-align:top">${escape(label)}</td>` +
            `<td style="white-space:pre-line"><strong>${escape(value)}</strong></td></tr>`,
        )
        .join('') +
      '</table>',
  };
}
const page = (body: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0b2545">${body}</div>`;
const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

/**
 * The two emails a quote request sends: one to the team (always Indonesian, every field, reply
 * goes to the customer) and a confirmation to the customer in the language of the page they
 * used. The confirmation never repeats the free-text message, so the form cannot be used to send
 * arbitrary text to someone else's address.
 */
export function quoteEmails(
  request: QuoteRequest,
  options: {
    /** Indonesian wording, for the team email's field labels. */
    team: Dictionary;
    /** Wording in the customer's language. */
    customer: Dictionary;
    /** Service title in Indonesian and in the customer's language. */
    service: { team: string; customer: string };
    company: string;
    quoteTo: string;
    origin: string;
  },
): { team: Mail; customer: Mail } {
  const { team: id, customer: t, service, company, quoteTo, origin } = options;
  const size = (dictionary: Dictionary) => dictionary.container.sizes[request.containerType].name;
  const teamRows = rows([
    [id.contact.fullName, request.fullName],
    [id.contact.company, request.company],
    [id.contact.phoneField, request.phone],
    [id.contact.emailField, request.email],
    [id.contact.serviceType, service.team],
    [id.contact.pickup, request.pickup],
    [id.contact.destination, request.destination],
    [id.contact.containerType, size(id)],
    ...(request.message ? ([[id.contact.message, request.message]] as [string, string][]) : []),
  ]);
  const admin = `${origin}/admin/inquiries`;
  const teamIntro = 'Ada permintaan penawaran baru dari website.';
  const teamOutro = `Balas email ini untuk menjawab pelanggan langsung. Semua permintaan: ${admin}`;
  const name = oneLine(request.fullName, 60);
  const customerRows = rows([
    [t.contact.serviceType, service.customer],
    [t.contact.containerType, size(t)],
    [t.contact.pickup, oneLine(request.pickup)],
    [t.contact.destination, oneLine(request.destination)],
  ]);
  const greeting = fill(t.mail.greeting, { name });
  const intro = fill(t.mail.intro, { company });
  const signature = fill(t.mail.signature, { company });
  return {
    team: {
      to: quoteTo,
      replyTo: request.email,
      subject: oneLine(`Permintaan penawaran baru: ${request.company} (${service.team})`, 160),
      text: `${teamIntro}\n\n${teamRows.text}\n\n${teamOutro}\n`,
      html: page(
        `<p>${escape(teamIntro)}</p>${teamRows.html}` +
          `<p>Balas email ini untuk menjawab pelanggan langsung. ` +
          `<a href="${escape(admin)}">Lihat semua permintaan</a></p>`,
      ),
    },
    customer: {
      to: request.email,
      replyTo: quoteTo,
      subject: oneLine(t.mail.subject, 160),
      text: `${greeting}\n\n${intro}\n\n${customerRows.text}\n\n${t.mail.outro}\n\n${signature}\n`,
      html: page(
        `<p>${escape(greeting)}</p>${paragraphs(intro)}${customerRows.html}` +
          `${paragraphs(t.mail.outro)}${paragraphs(signature)}`,
      ),
    },
  };
}

/** Whether quote emails will actually go out (shown on the admin checklist). */
export function mailReady() {
  const settings = mailSettings();
  return settings.transport === 'json' || Boolean(settings.host && settings.from);
}

let warned = false;
// Orders outbox files by sending order even within the same millisecond.
let written = 0;
/** Sends one message. Returns false instead of throwing; logs only the error kind. */
export async function sendMail(mail: Mail, label: string): Promise<boolean> {
  const settings = mailSettings();
  const from = settings.from || settings.quoteTo;
  try {
    if (settings.transport === 'json') {
      const info = await nodemailer
        .createTransport({ jsonTransport: true })
        .sendMail({ ...mail, from });
      mkdirSync(settings.outbox, { recursive: true });
      writeFileSync(
        path.join(
          settings.outbox,
          `${Date.now()}-${String(++written).padStart(6, '0')}-${label}-${randomUUID()}.json`,
        ),
        info.message.toString(),
      );
      return true;
    }
    if (!settings.host) {
      if (!warned) console.warn('Quote email is not configured (SMTP_HOST is empty); skipped.');
      warned = true;
      return false;
    }
    await nodemailer
      .createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: settings.user ? { user: settings.user, pass: settings.pass } : undefined,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
      })
      .sendMail({ ...mail, from });
    return true;
  } catch (error) {
    const kind =
      error instanceof Error
        ? `${error.name}${'code' in error ? ` ${error.code}` : ''}`
        : 'Unknown';
    console.error(`Quote email (${label}) was not sent: ${kind}`);
    return false;
  }
}

/** The team email first, then the customer's confirmation. Never throws. */
export async function sendQuoteEmails(emails: { team: Mail; customer: Mail }) {
  const team = await sendMail(emails.team, 'team');
  const customer = await sendMail(emails.customer, 'customer');
  return { team, customer };
}
