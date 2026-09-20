import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { media } from '../db/schema';
import { uploadsDir } from './env';
export const mediaPattern = /^(fleet|services|projects|clients|general)\/([a-f0-9-]+\.webp)$/;
export function mediaFile(relative: string) {
  if (!mediaPattern.test(relative)) throw new Error('Invalid media path');
  return path.join(uploadsDir, relative);
}
export async function saveImage(file: File, folder: string) {
  if (!['fleet', 'services', 'projects', 'clients', 'general'].includes(folder))
    throw new Error('Invalid upload category.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPEG, PNG or WebP image.');
  if (!file.size || file.size > 5 * 1024 * 1024)
    throw new Error('Images must be smaller than 5 MB.');
  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    const metadata = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format || ''))
      throw new Error('Unsupported image');
    output = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error('This file is not a valid supported image, or its dimensions are too large.');
  }
  const id = randomUUID();
  const relative = `${folder}/${id}.webp`;
  const filePath = mediaFile(relative);
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, output, { flag: 'wx', mode: 0o600 });
  try {
    db.insert(media)
      .values({ id, path: `/media/${relative}`, mime: 'image/webp', size: output.length })
      .run();
  } catch (error) {
    await unlink(filePath);
    throw error;
  }
  return `/media/${relative}`;
}
export function assertMediaReference(value: string) {
  if (value.startsWith('/media/') && !db.select().from(media).where(eq(media.path, value)).get())
    throw new Error('The selected image no longer exists. Upload it again.');
}
