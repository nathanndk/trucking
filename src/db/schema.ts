import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
const timestamps = () => ({
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('admin'),
  ...timestamps(),
});
export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    ...timestamps(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_idx').on(t.userId)],
);
export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps(),
  },
  (t) => [
    index('account_user_idx').on(t.userId),
    uniqueIndex('account_provider_idx').on(t.providerId, t.accountId),
  ],
);
export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    ...timestamps(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);
const content = () => ({
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  shortDescription: text('short_description').notNull().default(''),
  description: text('description').notNull().default(''),
  image: text('image').notNull().default(''),
  published: integer('published', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps(),
});
export const services = sqliteTable(
  'services',
  { ...content(), icon: text('icon').notNull().default('Truck') },
  (t) => [index('services_publish_order_idx').on(t.published, t.sortOrder)],
);
export const fleet = sqliteTable(
  'fleet',
  {
    ...content(),
    vehicleType: text('vehicle_type').notNull().default(''),
    capacity: text('capacity').notNull().default(''),
    specifications: text('specifications').notNull().default(''),
  },
  (t) => [index('fleet_publish_order_idx').on(t.published, t.sortOrder)],
);
export const coverage = sqliteTable(
  'coverage',
  {
    ...content(),
    province: text('province').notNull().default(''),
    latitude: real('latitude'),
    longitude: real('longitude'),
  },
  (t) => [index('coverage_publish_order_idx').on(t.published, t.sortOrder)],
);
export const projects = sqliteTable(
  'projects',
  {
    ...content(),
    clientName: text('client_name').notNull().default(''),
    projectYear: text('project_year').notNull().default(''),
  },
  (t) => [index('projects_publish_order_idx').on(t.published, t.sortOrder)],
);
export const clients = sqliteTable(
  'clients',
  { ...content(), website: text('website').notNull().default('') },
  (t) => [index('clients_order_idx').on(t.sortOrder)],
);
export const siteSettings = sqliteTable('site_settings', {
  id: integer('id').primaryKey(),
  companyName: text('company_name').notNull(),
  legalName: text('legal_name').notNull(),
  tagline: text('tagline').notNull(),
  shortDescription: text('short_description').notNull(),
  about: text('about').notNull(),
  vision: text('vision').notNull(),
  mission: text('mission').notNull(),
  established: text('established').notNull(),
  phone: text('phone').notNull(),
  whatsapp: text('whatsapp').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
  mapsUrl: text('maps_url').notNull().default(''),
  instagram: text('instagram').notNull().default(''),
  linkedin: text('linkedin').notNull().default(''),
  ctaText: text('cta_text').notNull(),
  logo: text('logo').notNull().default(''),
  favicon: text('favicon').notNull().default(''),
  statistics: text('statistics', { mode: 'json' })
    .$type<{ value: string; label: string }[]>()
    .notNull(),
  credentials: text('credentials').notNull().default(''),
  demoMode: integer('demo_mode', { mode: 'boolean' }).notNull().default(true),
  ...timestamps(),
});
export const inquiries = sqliteTable(
  'inquiries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    fullName: text('full_name').notNull(),
    company: text('company').notNull(),
    phone: text('phone').notNull(),
    email: text('email').notNull(),
    pickup: text('pickup').notNull(),
    destination: text('destination').notNull(),
    cargo: text('cargo').notNull(),
    weight: text('weight').notNull(),
    vehicle: text('vehicle').notNull().default(''),
    message: text('message').notNull().default(''),
    status: text('status', { enum: ['new', 'contacted', 'quoted', 'closed'] })
      .notNull()
      .default('new'),
    ...timestamps(),
  },
  (t) => [index('inquiries_status_date_idx').on(t.status, t.createdAt)],
);
export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  path: text('path').notNull().unique(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  ...timestamps(),
});
export const rateLimit = sqliteTable('rate_limit', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
