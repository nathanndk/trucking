/** The quote form fields a visitor types or picks. Token and honeypot are never echoed back. */
export const quoteFields = [
  'fullName',
  'company',
  'phone',
  'email',
  'serviceType',
  'pickup',
  'destination',
  'containerType',
  'message',
] as const;
export type QuoteValues = Partial<Record<(typeof quoteFields)[number], string>>;

/**
 * What a visitor submitted, read back from the request when the server refused it (expired form,
 * too many requests, invalid input), so the page can show the form filled in again instead of
 * empty. Astro reads the action from a clone of the request, so the body is still available here.
 * Values are only ever shown to the person who sent them, and the form escapes them like any text.
 */
export async function submittedQuote(request: Request): Promise<QuoteValues> {
  if (request.method !== 'POST') return {};
  try {
    const form = await request.formData();
    const values: QuoteValues = {};
    for (const field of quoteFields) {
      const value = form.get(field);
      if (typeof value === 'string' && value) values[field] = value.slice(0, 3000);
    }
    return values;
  } catch {
    return {};
  }
}
