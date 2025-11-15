/**
 * Validation schemas using Zod
 * Replaces custom validation utilities
 */

import { z } from 'zod';

// Category schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().default(''),
  visibility: z.enum(['Show', 'Hide']).default('Show'),
  year: z.number().int().min(1900).max(3000).nullable().optional()
});

export const categoryUpdateSchema = categorySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required for update'
);

// Parameter schemas
export const parameterValueSchema = z.object({
  label: z.string(),
  id: z.string().optional()
});

export const parameterConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional()
});

export const parameterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().default(''),
  type: z.enum(['Dropdown', 'Slider', 'Toggle Switch', 'Radio Buttons', 'Checkbox']),
  visibility: z.enum(['Basic', 'Advanced']).default('Basic'),
  categoryId: z.string().min(1, 'Category ID is required'),
  required: z.boolean().default(false),
  values: z.union([
    z.array(parameterValueSchema), // For dropdown, radio, checkbox
    z.object({ on: z.string(), off: z.string() }) // For toggle
  ]).optional(),
  config: parameterConfigSchema.optional()
});

export const parameterUpdateSchema = parameterSchema.partial().omit({ categoryId: true });

// Content generation schemas
export const generationRequestSchema = z.object({
  type: z.enum(['fiction', 'image', 'combined']),
  parameters: z.record(z.any()), // Dynamic parameter values
  year: z.number().int().min(1900).max(3000).optional()
});

// Content schemas
export const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['fiction', 'image', 'combined']),
  content: z.string().optional(),
  imageData: z.any().optional(), // Binary data
  year: z.number().int().min(1900).max(3000).nullable().optional()
});

export const contentUpdateSchema = contentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required for update'
);

// Settings schema
export const settingsSchema = z.object({
  ai: z.object({
    models: z.object({
      fiction: z.string(),
      image: z.string()
    }),
    parameters: z.object({
      fiction: z.object({
        temperature: z.number(),
        max_tokens: z.number(),
        default_story_length: z.number(),
        system_prompt: z.string()
      }),
      image: z.object({
        size: z.string(),
        quality: z.string(),
        prompt_suffix: z.string()
      })
    })
  }),
  defaults: z.object({
    content_type: z.string()
  })
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const contentFiltersSchema = paginationSchema.extend({
  type: z.enum(['fiction', 'image', 'combined']).optional(),
  year: z.coerce.number().int().min(1900).max(3000).optional()
});

export const parameterFiltersSchema = z.object({
  categoryId: z.string().optional()
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

export const yearParamSchema = z.object({
  year: z.coerce.number().int().min(1900).max(3000)
});