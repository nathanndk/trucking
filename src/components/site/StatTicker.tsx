import { NumberTicker } from '@/components/ui/number-ticker';

/**
 * Splits an administrator-typed figure such as "25.000+" or "10+" into prefix, number and suffix.
 * Dots and commas count as thousands separators only in groups of three; anything else (a
 * decimal, a range, a word) is returned as null and shown as typed.
 */
export function parseFigure(
  value: string,
): { prefix: string; number: number; suffix: string } | null {
  const match = value.trim().match(/^(\D*?)(\d{1,3}(?:[.,]\d{3})+|\d+)(\D*)$/);
  if (!match) return null;
  return { prefix: match[1], number: Number(match[2].replace(/[.,]/g, '')), suffix: match[3] };
}

/** A company figure that counts up once it scrolls into view. */
export default function StatTicker({ value, locale }: { value: string; locale: string }) {
  const figure = parseFigure(value);
  if (!figure) return <span>{value}</span>;
  return (
    <span>
      {figure.prefix}
      <NumberTicker value={figure.number} locale={locale} />
      {figure.suffix}
    </span>
  );
}
