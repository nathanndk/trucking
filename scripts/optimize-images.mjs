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
  'about-team': ['9.jpg', [640, 1280]],
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
// The favicon has no background. The logo was supplied on white, so white is turned into
// transparency: how far a pixel is from white decides its opacity, and the colour is then
// worked back so the pixel looks the same over white. Lines stay anti-aliased, and the
// solid parts keep the logo's own colours, so the mark also reads on dark browser tabs.
const { data, info } = await sharp(globe).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const cutout = Buffer.alloc(info.width * info.height * 4);
const solidAt = 96; // a channel this far below white counts as fully opaque line colour
for (let i = 0; i < info.width * info.height; i++) {
  const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
  const alpha = Math.min(1, (255 - Math.min(r, g, b)) / solidAt);
  const lift = (channel) =>
    alpha ? Math.max(0, Math.min(255, Math.round((channel - (1 - alpha) * 255) / alpha))) : 0;
  cutout.set([lift(r), lift(g), lift(b), Math.round(alpha * 255)], i * 4);
}
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
for (const [size, file] of [
  [180, `${output}/favicon.png`],
  [180, 'public/favicon.png'],
])
  await sharp(cutout, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: size - 12, height: size - 12, fit: 'contain', background: clear })
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: clear })
    .png({ compressionLevel: 9 })
    .toFile(file);
console.log('Brand images generated.');
