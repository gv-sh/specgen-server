/**
 * Validation schemas using Zod
 * Configuration-driven validation with dynamic limits
 */

import { z } from 'zod';
import config from '../config/index.js';

// Category schemas
export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(config.get('validation.maxNameLength')),
  description: z.string().max(config.get('validation.maxDescriptionLength')).default(''),
  visibility: z.enum(['Show', 'Hide']).default('Show'),
  year: z.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).nullable().optional()
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
  name: z.string().min(1, 'Name is required').max(config.get('validation.maxNameLength')),
  description: z.string().max(config.get('validation.maxDescriptionLength')).default(''),
  type: z.enum(['select', 'text', 'number', 'boolean', 'range']),
  visibility: z.enum(['Basic', 'Advanced', 'Hide']).default('Basic'),
  category_id: z.string().min(1, 'Category ID is required'),
  required: z.boolean().default(false),
  parameter_values: z.union([
    z.array(parameterValueSchema), // For dropdown, radio, checkbox
    z.object({ on: z.string(), off: z.string() }) // For toggle
  ]).optional(),
  parameter_config: parameterConfigSchema.optional()
});

export const parameterUpdateSchema = parameterSchema.partial().omit({ category_id: true });

// Content generation schemas
export const generationRequestSchema = z.object({
  type: z.enum(['fiction', 'image', 'combined']),
  parameters: z.record(z.any()).refine(
    (params) => Object.keys(params).length <= config.get('validation.maxParametersPerRequest'),
    `Too many parameters. Maximum ${config.get('validation.maxParametersPerRequest')} allowed`
  ),
  year: z.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).optional()
});

// Content schemas
export const contentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(config.get('validation.maxTitleLength')),
  content_type: z.enum(['fiction', 'image', 'combined']),
  fiction_content: z.string().max(config.get('validation.maxContentLength')).optional(),
  image_url: z.string().url().optional(),
  image_prompt: z.string().max(config.get('validation.maxPromptLength')).optional(),
  word_count: z.number().int().min(0).optional(),
  generation_time: z.number().int().min(0).optional()
});

export const contentUpdateSchema = contentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'At least one field is required for update'
);

// Settings schema
export const settingsSchema = z.record(z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({}).passthrough() // Allow any object structure
])).refine(
  (settings) => Object.keys(settings).length <= config.get('validation.maxSettingsKeys'),
  `Too many settings. Maximum ${config.get('validation.maxSettingsKeys')} allowed`
);

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(config.get('validation.maxPageSize')).default(config.get('validation.defaultPageSize'))
});

export const contentFiltersSchema = paginationSchema.extend({
  type: z.enum(['fiction', 'image', 'combined']).optional(),
  year: z.coerce.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max')).optional()
});

export const parameterFiltersSchema = z.object({
  categoryId: z.string().optional()
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

export const yearParamSchema = z.object({
  year: z.coerce.number().int().min(config.get('validation.yearRange.min')).max(config.get('validation.yearRange.max'))
});