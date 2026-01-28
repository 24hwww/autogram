import { z } from 'zod';
import { images, insertImageSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  rateLimit: z.object({
    message: z.string(),
    remaining: z.number().optional(),
  })
};

export const api = {
  images: {
    list: {
      method: 'GET' as const,
      path: '/api/images',
      responses: {
        200: z.array(z.custom<typeof images.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/images/:id',
      responses: {
        200: z.custom<typeof images.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/generate',
      input: z.object({
        prompt: z.string().min(1, "Prompt is required"),
        caption: z.string().optional(),
        autoSchedule: z.boolean().optional(),
        scheduleAt: z.string().optional(),
        scheduleInterval: z.number().optional(),
        isCarousel: z.boolean().optional(),
        imageCount: z.number().min(1).max(10).optional(),
      }),
      responses: {
        201: z.custom<typeof images.$inferSelect>(),
        400: errorSchemas.validation,
        429: errorSchemas.rateLimit,
      },
    },
    publish: {
      method: 'POST' as const,
      path: '/api/images/:id/publish',
      responses: {
        200: z.custom<typeof images.$inferSelect>(),
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
      },
    },
    schedule: {
      method: 'POST' as const,
      path: '/api/images/:id/schedule',
      input: z.object({
        scheduledAt: z.string().datetime(),
      }),
      responses: {
        200: z.custom<typeof images.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/images/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  limits: {
    get: {
      method: 'GET' as const,
      path: '/api/limits',
      responses: {
        200: z.object({
          date: z.string(),
          count: z.number(),
          limit: z.number(),
          remaining: z.number(),
          instagramUsername: z.string().optional(),
          instagramConnected: z.boolean().optional(),
          instagramError: z.string().optional(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
