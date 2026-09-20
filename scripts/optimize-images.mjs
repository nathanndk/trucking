import sharp from 'sharp';
for (const width of [768, 1280, 1920])
  await sharp('public/images/hero.jpg')
    .resize({ width })
    .webp({ quality: 80 })
    .toFile(`public/images/hero-${width}.webp`);
console.log('Responsive hero images generated.');
