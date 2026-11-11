// Generates the bundled brand imagery in public/images/genesis from assets-src/genesis.
// Run with `pnpm images:optimize` after replacing a source photo.
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'assets-src/genesis';
const output = 'public/images/genesis';
await mkdir(output, { recursive: true });

/** name → [source file, widths, optional crop region in source pixels] */
const photos = {
  'hero-port': ['3.jpg', [768, 1280, 1920]],
  'service-container': ['8.jpg', [640, 1280]],
  'service-trucking': ['6.jpg', [640, 1280]],
  // The source is a portrait photo padded with white bars; keep only the photo itself.
  'service-factory-port': ['4.jpg', [640], { left: 602, top: 270, width: 716, height: 537 }],
  'service-customs': ['10.jpg', [640, 1280]],
  'service-coordination': ['5.jpg', [640, 1280]],
  'about-handshake': ['2.jpg', [640, 1280]],
  'about-team': ['9.jpg', [640, 1280]],
  'cta-handshake': ['11.jpg', [640, 1280]],
};
for (const [name, [file, widths, region]] of Object.entries(photos))
  for (const width of widths) {
    let image = sharp(`${source}/${file}`);
    if (region) image = image.extract(region);
    await image
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(`${output}/${name}-${width}.webp`);
  }

// Social sharing image (1200×630 JPEG is the most widely supported format).
await sharp(`${source}/3.jpg`)
  .resize({ width: 1200, height: 630, fit: 'cover' })
  .jpeg({ quality: 82 })
  .toFile(`${output}/og.jpg`);

// Logo as supplied (white background), plus a square favicon cut from the globe mark.
await sharp(`${source}/1.png`).webp({ quality: 92 }).toFile(`${output}/logo.webp`);
const mark = await sharp(`${source}/1.png`)
  .extract({ left: 0, top: 0, width: 184, height: 192 })
  .toBuffer();
const globe = await sharp(mark).trim().toBuffer();
for (const [size, file] of [
  [180, `${output}/favicon.png`],
  [180, 'public/favicon.png'],
])
  await sharp(globe)
    .resize({ width: size - 24, height: size - 24, fit: 'contain', background: '#ffffff' })
    .extend({ top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff' })
    .png({ palette: true })
    .toFile(file);
console.log('Brand images generated.');
