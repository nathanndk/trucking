/**
 * Figures for the admin overview. Pure functions over plain rows, so they can be tested
 * without a database.
 */
export const inquiryStatuses = ['new', 'contacted', 'quoted', 'closed'] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];
export const statusLabels: Record<InquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  closed: 'Closed',
};

export function statusCounts(items: { status: InquiryStatus }[]): Record<InquiryStatus, number> {
  const counts = { new: 0, contacted: 0, quoted: 0, closed: 0 };
  for (const item of items) counts[item.status]++;
  return counts;
}

const jakartaOffset = 7 * 60 * 60 * 1000;
const day = 24 * 60 * 60 * 1000;
/** Start of the Monday-based week containing `date`, in Jakarta time, as a UTC timestamp. */
function weekStart(date: Date): number {
  const local = new Date(date.getTime() + jakartaOffset);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - sinceMonday);
}
/** Requests received in each of the last `weeks` weeks, oldest first, including empty weeks. */
export function weeklyRequests(
  items: { createdAt: Date }[],
  now = new Date(),
  weeks = 8,
): { week: string; requests: number }[] {
  const current = weekStart(now);
  const buckets = Array.from({ length: weeks }, (_, i) => current - (weeks - 1 - i) * 7 * day);
  return buckets.map((start) => ({
    week: new Date(start).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }),
    requests: items.filter((item) => weekStart(item.createdAt) === start).length,
  }));
}

export function containerSplit(
  items: { containerType: string }[],
): Record<'20ft' | '40ft', number> {
  return {
    '20ft': items.filter((item) => item.containerType === '20ft').length,
    '40ft': items.filter((item) => item.containerType === '40ft').length,
  };
}

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  /** Admin screen where the detail is filled in; none when the fix is server configuration. */
  href?: string;
  where: string;
};
/**
 * What the public website still leaves out because it is blank, with the place to fix
 * each one.
 */
export function websiteChecklist(
  settings: {
    whatsapp: string;
    phone: string;
    email: string;
    address: string;
    mapsUrl: string;
    established: string;
    credentials: string;
  },
  content: { projects: number; clients: number; articles: number; servicesWithoutEnglish: number },
  /** Whether quote requests are emailed (SMTP configured on the server). */
  system: { mailReady: boolean } = { mailReady: true },
): ChecklistItem[] {
  const filled = (value: string) => value.trim().length > 0;
  const setting = (id: string, label: string, value: string): ChecklistItem => ({
    id,
    label,
    done: filled(value),
    href: '/admin/settings',
    where: 'Settings',
  });
  return [
    setting('whatsapp', 'WhatsApp number', settings.whatsapp),
    setting('phone', 'Office phone', settings.phone),
    setting('email', 'Email address', settings.email),
    setting('address', 'Office address', settings.address),
    setting('maps', 'Google Maps link', settings.mapsUrl),
    setting('established', 'Year established', settings.established),
    setting('credentials', 'Legal credentials', settings.credentials),
    {
      id: 'projects',
      label: 'At least one published project',
      done: content.projects > 0,
      href: '/admin/projects',
      where: 'Projects',
    },
    {
      id: 'clients',
      label: 'At least one published client',
      done: content.clients > 0,
      href: '/admin/clients',
      where: 'Clients',
    },
    {
      id: 'articles',
      label: 'At least one published article',
      done: content.articles > 0,
      href: '/admin/articles',
      where: 'Articles',
    },
    {
      id: 'services-english',
      label: 'English text for every service',
      done: content.servicesWithoutEnglish === 0,
      href: '/admin/services',
      where: 'Services',
    },
    {
      id: 'quote-email',
      label: 'Quote requests emailed to the team',
      done: system.mailReady,
      where: 'Set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM in the server environment',
    },
  ];
}
