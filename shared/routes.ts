import { z } from 'zod';
import type { ImageModel } from './types';

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
  server: z.object({
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
        200: z.array(z.custom<ImageModel>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/images/:id',
      responses: {
        200: z.custom<ImageModel>(),
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
        201: z.custom<ImageModel>(),
        400: errorSchemas.validation,
        429: errorSchemas.rateLimit,
      },
    },
    publish: {
      method: 'POST' as const,
      path: '/api/images/:id/publish',
      responses: {
        200: z.custom<ImageModel>(),
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
        200: z.custom<ImageModel>(),
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
  generate: {
    prompt: {
      method: 'POST' as const,
      path: '/api/generate/prompt',
      input: z.object({
        theme: z.string().optional(),
        timeOfDay: z.string().optional(),
        contentType: z.enum(['image', 'verse']).optional(),
      }),
      responses: {
        200: z.object({
          prompt: z.string(),
          caption: z.string(),
          type: z.enum(['image', 'verse']),
          author: z.string().optional(),
        }),
        500: errorSchemas.server,
      },
    },
    full: {
      method: 'POST' as const,
      path: '/api/generate/full',
      input: z.object({
        theme: z.string().optional(),
        timeOfDay: z.string().optional(),
        contentType: z.enum(['image', 'verse']).optional(),
        autoPublish: z.boolean().optional(),
      }),
      responses: {
        201: z.custom<ImageModel>(),
        500: errorSchemas.server,
      },
    },
  },
  scheduler: {
    status: {
      method: 'GET' as const,
      path: '/api/scheduler/status',
      responses: {
        200: z.object({
          running: z.boolean(),
          interval: z.number(),
          nextRun: z.string().optional(),
          scheduledCount: z.number(),
        }),
      },
    },
    updateInterval: {
      method: 'POST' as const,
      path: '/api/scheduler/interval',
      input: z.object({
        interval: z.number().min(60000), // minimum 1 minute
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          interval: z.number(),
        }),
      },
    },
    trigger: {
      method: 'POST' as const,
      path: '/api/scheduler/trigger',
      responses: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
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
  instagram: {
    login: {
      method: 'POST' as const,
      path: '/api/instagram/login',
      input: z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
    cookies: {
      method: 'POST' as const,
      path: '/api/instagram/cookies',
      input: z.object({
        username: z.string().min(1),
        cookies: z.unknown(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
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
