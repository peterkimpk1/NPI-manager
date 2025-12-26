import { z } from 'zod'

export const npiItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category_id: z.string().uuid('Select a category'),
  location_id: z.string().uuid('Select a location'),
  count: z.coerce.number().min(0, 'Count cannot be negative'),
  uom: z.string().min(1, 'Unit of measure is required'),
  desired_count: z.coerce.number().min(0).optional().nullable(),
  reorder_point: z.coerce.number().min(0).optional().nullable(),
  unit_cost: z.coerce.number().min(0, 'Cost cannot be negative'),
  gram_conversion: z.coerce.number().positive().optional().nullable(),
})

export const restockSchema = z.object({
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  notes: z.string().max(500).optional(),
})

export const adjustStockSchema = z.object({
  new_count: z.coerce.number().min(0, 'Count cannot be negative'),
  notes: z.string().max(500).optional(),
})

export type NpiItemFormData = z.infer<typeof npiItemSchema>
export type RestockFormData = z.infer<typeof restockSchema>
export type AdjustStockFormData = z.infer<typeof adjustStockSchema>
