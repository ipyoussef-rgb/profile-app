import { z } from "zod";

export const catalogCreateSchema = z
  .object({
    slug: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
    name_en: z.string().min(1).max(80),
    name_de: z.string().min(1).max(80),
    multi_select: z.boolean().default(true),
  })
  .strict();

export const catalogUpdateSchema = z
  .object({
    name_en: z.string().min(1).max(80).optional(),
    name_de: z.string().min(1).max(80).optional(),
    multi_select: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const catalogValueCreateSchema = z
  .object({
    slug: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
    label_en: z.string().min(1).max(80),
    label_de: z.string().min(1).max(80),
    sort_order: z.number().int().min(0).max(9999).default(0),
  })
  .strict();

export const catalogValueUpdateSchema = z
  .object({
    label_en: z.string().min(1).max(80).optional(),
    label_de: z.string().min(1).max(80).optional(),
    sort_order: z.number().int().min(0).max(9999).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export type CatalogCreateInput = z.infer<typeof catalogCreateSchema>;
export type CatalogUpdateInput = z.infer<typeof catalogUpdateSchema>;
export type CatalogValueCreateInput = z.infer<typeof catalogValueCreateSchema>;
export type CatalogValueUpdateInput = z.infer<typeof catalogValueUpdateSchema>;
