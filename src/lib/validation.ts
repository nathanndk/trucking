import { z } from 'zod';
import { collections, mediaFolders } from './content-config';
export const collectionSchema = z.enum(collections);
export const webUrl = z
  .string()
  .max(500)
  .refine(
    (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
    'Use a complete http:// or https:// URL.',
  );
const mediaPath = new RegExp(`^/media/(${mediaFolders.join('|')})/[a-f0-9-]+\\.webp$`);
export const imagePath = z
  .string()
  .max(300)
  .refine(
    (v) =>
      !v ||
      (/^\/images\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|webp|png|svg)$/.test(v) && !v.includes('..')) ||
      mediaPath.test(v),
    'Select an uploaded image.',
  );
const short = z.string().trim().max(250);
export const contentInput = z
  .object({
    id: z.number().int().positive().optional(),
    collection: collectionSchema,
    title: short.min(2),
    slug: z
      .string()
      .min(2)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens.')
      // Locale codes are reserved path segments.
      .refine((v) => v !== 'id' && v !== 'en', 'This slug is reserved. Choose another.'),
    shortDescription: z.string().trim().max(500).default(''),
    description: z.string().trim().max(10000).default(''),
    titleEn: short.default(''),
    shortDescriptionEn: z.string().trim().max(500).default(''),
    descriptionEn: z.string().trim().max(10000).default(''),
    image: imagePath.default(''),
    published: z.boolean(),
    sortOrder: z.number().int().min(0).max(100000),
    icon: short.optional(),
    clientName: short.optional(),
    projectYear: z
      .string()
      .regex(/^(19|20|21)\d{2}$/)
      .optional(),
    website: webUrl.optional(),
  })
  .superRefine((v, c) => {
    const fields = v.collection === 'projects' ? (['clientName', 'projectYear'] as const) : [];
    for (const k of fields)
      if (!v[k]?.trim())
        c.addIssue({ code: 'custom', path: [k], message: 'This field is required.' });
  });
const blankOr = <T extends z.ZodType>(schema: T) => z.union([z.literal(''), schema]);
export const settingsInput = z.object({
  companyName: short.min(2),
  legalName: short.min(2),
  tagline: short.min(2),
  shortDescription: z.string().trim().min(10).max(1000),
  about: z.string().trim().min(10).max(10000),
  vision: z.string().trim().min(5).max(3000),
  mission: z.string().trim().min(5).max(5000),
  // Contact details may stay blank until the company confirms them; the public
  // website then shows a "to be updated" marker instead of a link.
  established: blankOr(z.string().regex(/^(19|20)\d{2}$/)),
  phone: blankOr(
    z
      .string()
      .min(6)
      .max(30)
      .regex(/^[+\d\s()-]+$/),
  ),
  whatsapp: blankOr(z.string().regex(/^\d{8,16}$/)),
  email: blankOr(z.email().max(250)),
  address: z.string().trim().max(1000),
  mapsUrl: webUrl,
  instagram: webUrl,
  linkedin: webUrl,
  ctaText: short.min(2),
  logo: imagePath,
  favicon: imagePath,
  credentials: z.string().max(3000),
  taglineEn: short.default(''),
  shortDescriptionEn: z.string().trim().max(1000).default(''),
  aboutEn: z.string().trim().max(10000).default(''),
  visionEn: z.string().trim().max(3000).default(''),
  missionEn: z.string().trim().max(5000).default(''),
  ctaTextEn: short.default(''),
  credentialsEn: z.string().max(3000).default(''),
  statistics: z
    .array(
      z.object({
        value: z.string().trim().min(1).max(20),
        label: short.min(1),
        labelEn: short.default(''),
      }),
    )
    .max(4),
});
export const containerTypes = ['20ft', '40ft'] as const;
export const quoteInput = z.object({
  fullName: short.min(2),
  company: short.min(2),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(30)
    .regex(/^[+\d\s()-]+$/),
  email: z.email().trim().max(250),
  pickup: short.min(2),
  destination: short.min(2),
  /** Slug of a published service; the action stores the service title. */
  serviceType: short.min(2),
  containerType: z.enum(containerTypes),
  message: z
    .string()
    .trim()
    .max(3000)
    .nullish()
    .transform((v) => v ?? ''),
  website: z
    .string()
    .max(500)
    .nullish()
    .transform((v) => v ?? ''),
  token: z.string().max(300),
});
