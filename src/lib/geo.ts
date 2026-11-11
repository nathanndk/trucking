import data from './geo/indonesia.json';
import type { Locale } from '../i18n';

// Address ranges allocated to Indonesia (APNIC delegation statistics, refreshed with
// `pnpm geo:update`). The lookup runs locally; no visitor address leaves the server.
const v4: number[] = data.v4; // flat list: start, end, start, end, …
const v6 = (() => {
  const prefixes: { bits: bigint; shift: bigint }[] = [];
  for (let i = 0; i < data.v6.length; i += 2)
    prefixes.push({
      bits: BigInt(`0x${data.v6[i]}`),
      shift: 64n - BigInt(data.v6[i + 1] as number),
    });
  return prefixes;
})();

function parseV4(address: string): number | undefined {
  const parts = address.split('.');
  if (parts.length !== 4) return undefined;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return undefined;
    value = value * 256 + Number(part);
  }
  return value;
}
/** The eight 16-bit groups of an IPv6 address, or undefined when it does not parse. */
function parseV6(address: string): number[] | undefined {
  let text = address.split('%')[0];
  // A dotted IPv4 tail (::ffff:203.0.113.5) becomes two hexadecimal groups.
  const tail = text.slice(text.lastIndexOf(':') + 1);
  if (tail.includes('.')) {
    const embedded = parseV4(tail);
    if (embedded === undefined) return undefined;
    text = `${text.slice(0, text.lastIndexOf(':') + 1)}${(embedded >>> 16).toString(16)}:${(embedded & 0xffff).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return undefined;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return undefined;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  if (groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return undefined;
  return groups.map((group) => parseInt(group, 16));
}
function isPrivateV4(value: number) {
  const first = Math.floor(value / 2 ** 24);
  const second = Math.floor(value / 2 ** 16) % 256;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}
function inIndonesiaV4(value: number) {
  let low = 0;
  let high = v4.length / 2 - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (value < v4[middle * 2]) high = middle - 1;
    else if (value > v4[middle * 2 + 1]) low = middle + 1;
    else return true;
  }
  return false;
}
/**
 * Whether a visitor's address is allocated to Indonesia. Returns undefined when the
 * address says nothing about location: loopback, private networks, or unparseable input.
 */
export function isIndonesianIp(address: string): boolean | undefined {
  const text = address.trim();
  if (!text.includes(':')) {
    const value = parseV4(text);
    if (value === undefined || isPrivateV4(value)) return undefined;
    return inIndonesiaV4(value);
  }
  const groups = parseV6(text);
  if (!groups) return undefined;
  // IPv4-mapped addresses (::ffff:a.b.c.d) are judged as IPv4.
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    const value = groups[6] * 65536 + groups[7];
    return isPrivateV4(value) ? undefined : inIndonesiaV4(value);
  }
  const unspecifiedOrLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] <= 1;
  const uniqueLocal = (groups[0] & 0xfe00) === 0xfc00;
  const linkLocal = (groups[0] & 0xffc0) === 0xfe80;
  if (unspecifiedOrLoopback || uniqueLocal || linkLocal) return undefined;
  const high = groups.slice(0, 4).reduce((value, group) => (value << 16n) | BigInt(group), 0n);
  return v6.some(({ bits, shift }) => high >> shift === bits >> shift);
}
/**
 * The site language a browser asks for through Accept-Language: Indonesian or English,
 * whichever ranks higher; English for browsers set to any other language; undefined
 * when the header is missing.
 */
export function preferredLanguage(header: string | null | undefined): Locale | undefined {
  if (!header?.trim()) return undefined;
  const ranked = header
    .split(',')
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().split(';');
      const quality = parameters.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const q = quality ? Number(quality.slice(2)) : 1;
      return {
        language: tag.trim().toLowerCase().split('-')[0],
        q: Number.isFinite(q) ? q : 0,
        index,
      };
    })
    .filter((entry) => entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  const match = ranked.find((entry) => entry.language === 'id' || entry.language === 'en');
  return match?.language === 'id' ? 'id' : 'en';
}
/**
 * Language for a visitor's first page. Location decides: Indonesian inside Indonesia,
 * English elsewhere. When the address carries no location (local development, a proxy
 * that does not pass the visitor address on), the browser language is used instead.
 */
export function detectLocale(visitor: {
  address?: string;
  acceptLanguage?: string | null;
}): Locale {
  const local = visitor.address ? isIndonesianIp(visitor.address) : undefined;
  if (local !== undefined) return local ? 'id' : 'en';
  return preferredLanguage(visitor.acceptLanguage) ?? 'id';
}
