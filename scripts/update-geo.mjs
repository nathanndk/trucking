// Rebuilds src/lib/geo/indonesia.json: the IP address ranges allocated to Indonesia,
// taken from APNIC's public delegation statistics. Run `pnpm geo:update` a few times
// a year; allocations change slowly. No visitor data is sent anywhere at runtime.
import { writeFile } from 'node:fs/promises';

const source = 'https://ftp.apnic.net/stats/apnic/delegated-apnic-latest';
const response = await fetch(source);
if (!response.ok) throw new Error(`APNIC download failed: ${response.status}`);
const text = await response.text();

const toNumber = (address) =>
  address.split('.').reduce((value, part) => value * 256 + Number(part), 0);
const v4 = [];
const v6 = [];
let generated = '';
for (const line of text.split('\n')) {
  const [registry, country, type, start, value, , status] = line.split('|');
  // Version line: 2|apnic|20261110|…
  if (registry === '2' && !generated) generated = type;
  if (country !== 'ID' || !['allocated', 'assigned'].includes(status)) continue;
  if (type === 'ipv4') {
    const first = toNumber(start);
    v4.push([first, first + Number(value) - 1]);
  } else if (type === 'ipv6') {
    // Keep the first 64 bits; every allocation is /64 or shorter.
    const groups = start.split('::')[0].split(':');
    while (groups.length < 4) groups.push('0');
    v6.push([groups.map((group) => group.padStart(4, '0')).join(''), Number(value)]);
  }
}
if (v4.length < 500 || v6.length < 100) throw new Error('Unexpectedly little data; not writing.');

// Merge neighbouring IPv4 blocks so the lookup table stays small.
v4.sort((a, b) => a[0] - b[0]);
const merged = [];
for (const range of v4) {
  const last = merged.at(-1);
  if (last && range[0] <= last[1] + 1) last[1] = Math.max(last[1], range[1]);
  else merged.push(range);
}
v6.sort((a, b) => a[0].localeCompare(b[0]));
await writeFile(
  'src/lib/geo/indonesia.json',
  `${JSON.stringify({ source, generated, v4: merged.flat(), v6: v6.flat() })}\n`,
);
console.log(`Indonesia: ${merged.length} IPv4 ranges, ${v6.length} IPv6 prefixes (${generated}).`);
