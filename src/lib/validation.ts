import { z } from 'zod';
import { collections } from './content-config';
export const collectionSchema = z.enum(collections);
export const webUrl = z
  .string()
  .max(500)
  .refine(
    (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
    'Use a complete http:// or https:// URL.',
  );
export const imagePath = z
  .string()
  .max(300)
  .refine(
    (v) =>
      !v ||
      (/^\/images\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|webp|png|svg)$/.test(v) && !v.includes('..')) ||
      /^\/media\/(fleet|services|projects|clients|general)\/[a-f0-9-]+\.webp$/.test(v),
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
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens.'),
    shortDescription: z.string().trim().max(500).default(''),
    description: z.string().trim().max(10000).default(''),
    image: imagePath.default(''),
    published: z.boolean(),
    sortOrder: z.number().int().min(0).max(100000),
    icon: short.optional(),
    vehicleType: short.optional(),
    capacity: short.optional(),
    specifications: z.string().max(5000).optional(),
    province: short.optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    clientName: short.optional(),
    projectYear: z
      .string()
      .regex(/^(19|20|21)\d{2}$/)
      .optional(),
    website: webUrl.optional(),
  })
  .superRefine((v, c) => {
    const fields =
      v.collection === 'fleet'
        ? (['vehicleType', 'capacity'] as const)
        : v.collection === 'coverage'
          ? (['province'] as const)
          : v.collection === 'projects'
            ? (['clientName', 'projectYear'] as const)
            : [];
    for (const k of fields)
      if (!v[k]?.trim())
        c.addIssue({ code: 'custom', path: [k], message: 'This field is required.' });
  });
export const settingsInput = z.object({
  companyName: short.min(2),
  legalName: short.min(2),
  tagline: short.min(2),
  shortDescription: z.string().trim().min(10).max(1000),
  about: z.string().trim().min(10).max(10000),
  vision: z.string().trim().min(5).max(3000),
  mission: z.string().trim().min(5).max(5000),
  established: z.string().regex(/^(19|20)\d{2}$/),
  phone: z
    .string()
    .min(6)
    .max(30)
    .regex(/^[+\d\s()-]+$/),
  whatsapp: z.string().regex(/^\d{8,16}$/),
  email: z.email().max(250),
  address: z.string().trim().min(5).max(1000),
  mapsUrl: webUrl,
  instagram: webUrl,
  linkedin: webUrl,
  ctaText: short.min(2),
  logo: imagePath,
  favicon: imagePath,
  credentials: z.string().max(3000),
  demoMode: z.boolean(),
  statistics: z
    .array(z.object({ value: z.string().trim().min(1).max(20), label: short.min(1) }))
    .min(1)
    .max(4),
});
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
  cargo: short.min(2),
  weight: short.min(1),
  vehicle: short.nullish().transform((v) => v ?? ''),
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
