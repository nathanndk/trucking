import { defineAction, ActionError } from 'astro:actions';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { inquiries, services, siteSettings } from '../db/schema';
import { auth } from '../lib/auth';
import { collectionSchema, contentInput, quoteInput, settingsInput } from '../lib/validation';
import { contentConfig, mediaFolders } from '../lib/content-config';
import { tables } from '../lib/repository';
import { assertMediaReference, saveImage } from '../lib/media';
import { allowRequest, verifyToken } from '../lib/spam';
async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user.role !== 'admin')
    throw new ActionError({ code: 'UNAUTHORIZED', message: 'Please sign in as an administrator.' });
}
function safeError(error: unknown): never {
  if (error instanceof ActionError) throw error;
  const message = error instanceof Error ? error.message : '';
  if (message.includes('UNIQUE constraint'))
    throw new ActionError({
      code: 'CONFLICT',
      message: 'This slug is already in use. Choose another.',
    });
  console.error('CMS mutation failed:', error instanceof Error ? error.name : 'Unknown error');
  throw new ActionError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unable to save your changes. Please try again.',
  });
}
export const server = {
  saveContent: defineAction({
    input: contentInput,
    handler: async (input, context) => {
      await requireAdmin(context.request);
      try {
        assertMediaReference(input.image);
        const {
          id,
          collection,
          title,
          slug,
          description,
          shortDescription,
          titleEn,
          shortDescriptionEn,
          descriptionEn,
          image,
          published,
          sortOrder,
        } = input;
        const values: Record<string, unknown> & { title: string; slug: string } = {
          title,
          slug,
          description,
          shortDescription,
          titleEn,
          shortDescriptionEn,
          descriptionEn,
          image,
          published,
          sortOrder,
          updatedAt: new Date(),
        };
        for (const field of contentConfig[collection].fields)
          values[field.name] = input[field.name as keyof typeof input];
        const table = tables[collection];
        if (id) {
          const result = db.update(table).set(values).where(eq(table.id, id)).run();
          if (!result.changes)
            throw new ActionError({
              code: 'NOT_FOUND',
              message: 'This record was deleted. Refresh the page.',
            });
          return { id };
        }
        const result = db.insert(table).values(values).returning({ id: table.id }).get();
        return result;
      } catch (error) {
        safeError(error);
      }
    },
  }),
  deleteContent: defineAction({
    input: z.object({ collection: collectionSchema, id: z.number().int().positive() }),
    handler: async ({ collection, id }, context) => {
      await requireAdmin(context.request);
      try {
        const table = tables[collection];
        db.delete(table).where(eq(table.id, id)).run();
        return { success: true };
      } catch (e) {
        safeError(e);
      }
    },
  }),
  publishContent: defineAction({
    input: z.object({
      collection: collectionSchema,
      id: z.number().int().positive(),
      published: z.boolean(),
    }),
    handler: async ({ collection, id, published }, context) => {
      await requireAdmin(context.request);
      try {
        const table = tables[collection];
        db.update(table).set({ published, updatedAt: new Date() }).where(eq(table.id, id)).run();
        return { success: true };
      } catch (e) {
        safeError(e);
      }
    },
  }),
  upload: defineAction({
    accept: 'form',
    input: z.object({
      file: z.instanceof(File),
      folder: z.enum(mediaFolders),
    }),
    handler: async ({ file, folder }, context) => {
      await requireAdmin(context.request);
      try {
        return { path: await saveImage(file, folder) };
      } catch (e) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message:
            e instanceof Error && /Choose|Images|valid supported|category/.test(e.message)
              ? e.message
              : 'Upload failed. Please try again.',
        });
      }
    },
  }),
  saveSettings: defineAction({
    input: settingsInput,
    handler: async (input, context) => {
      await requireAdmin(context.request);
      try {
        assertMediaReference(input.logo);
        assertMediaReference(input.favicon);
        db.update(siteSettings)
          .set({ ...input, updatedAt: new Date() })
          .where(eq(siteSettings.id, 1))
          .run();
        return { success: true };
      } catch (e) {
        safeError(e);
      }
    },
  }),
  inquiryStatus: defineAction({
    input: z.object({
      id: z.number().int().positive(),
      status: z.enum(['new', 'contacted', 'quoted', 'closed']),
    }),
    handler: async ({ id, status }, context) => {
      await requireAdmin(context.request);
      try {
        const result = db
          .update(inquiries)
          .set({ status, updatedAt: new Date() })
          .where(eq(inquiries.id, id))
          .run();
        if (!result.changes)
          throw new ActionError({ code: 'NOT_FOUND', message: 'Inquiry not found.' });
        return { success: true };
      } catch (e) {
        safeError(e);
      }
    },
  }),
  // Public. Error messages are shown translated by the contact page, keyed on the error code.
  quote: defineAction({
    accept: 'form',
    input: quoteInput,
    handler: async (input, context) => {
      if (input.website || !verifyToken(input.token))
        throw new ActionError({ code: 'BAD_REQUEST', message: 'Invalid or expired form token.' });
      let address = 'unknown';
      try {
        address = context.clientAddress;
      } catch {
        /* no address */
      }
      if (process.env.TRUST_PROXY === 'true')
        address = context.request.headers.get('x-real-ip') || address;
      if (!allowRequest(`quote:${address}`, 5, 60 * 60 * 1000))
        throw new ActionError({ code: 'TOO_MANY_REQUESTS', message: 'Too many requests.' });
      const service = db
        .select({ title: services.title })
        .from(services)
        .where(and(eq(services.slug, input.serviceType), eq(services.published, true)))
        .get();
      if (!service)
        throw new ActionError({ code: 'BAD_REQUEST', message: 'Unknown service selected.' });
      if (!allowRequest(`quote-token:${input.token}`, 1, 2 * 60 * 60 * 1000))
        throw new ActionError({ code: 'CONFLICT', message: 'This form was already submitted.' });
      const { website: _website, token: _token, ...values } = input;
      try {
        db.insert(inquiries)
          .values({ ...values, serviceType: service.title })
          .run();
        return { success: true };
      } catch (e) {
        safeError(e);
      }
    },
  }),
};
