'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { npiItemSchema, restockSchema, adjustStockSchema } from '@/lib/validations/inventory'
import type { NpiItem, Category, Location, InventoryStats } from '@/types/inventory'

export type ActionState = {
  error?: string
  success?: string
  data?: unknown
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function getLocations(): Promise<Location[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function getInventoryItems(): Promise<NpiItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('npi_items')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return (data || []) as NpiItem[]
}

export async function getInventoryStats(items: NpiItem[]): Promise<InventoryStats> {
  let healthy = 0, warning = 0, critical = 0, totalValue = 0

  items.forEach(item => {
    const stockValue = item.count * item.unit_cost
    totalValue += stockValue

    if (!item.desired_count) {
      healthy++
    } else {
      const ratio = item.count / item.desired_count
      if (ratio <= 0.2) critical++
      else if (ratio <= 0.5) warning++
      else healthy++
    }
  })

  return {
    total: items.length,
    healthy,
    warning,
    critical,
    totalValue,
  }
}

export async function createNpiItem(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const rawData = {
    name: formData.get('name'),
    category_id: formData.get('category_id'),
    location_id: formData.get('location_id'),
    count: formData.get('count'),
    uom: formData.get('uom'),
    desired_count: formData.get('desired_count') || null,
    reorder_point: formData.get('reorder_point') || null,
    unit_cost: formData.get('unit_cost'),
    gram_conversion: formData.get('gram_conversion') || null,
  }

  const result = npiItemSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Get category and location names for the denormalized fields
  const [categoryResult, locationResult] = await Promise.all([
    supabase.from('categories').select('name').eq('id', result.data.category_id).single(),
    supabase.from('locations').select('name').eq('id', result.data.location_id).single(),
  ])

  const { data, error } = await supabase
    .from('npi_items')
    .insert({
      ...result.data,
      category: categoryResult.data?.name || '',
      location: locationResult.data?.name || '',
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Create initial stock movement
  if (result.data.count > 0) {
    await supabase.from('stock_movements').insert({
      npi_item_id: data.id,
      quantity: result.data.count,
      previous_count: 0,
      new_count: result.data.count,
      movement_type: 'initial',
      created_by: user?.id,
    })
  }

  revalidatePath('/inventory')
  return { success: 'Item created successfully', data }
}

export async function updateNpiItem(
  itemId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const rawData = {
    name: formData.get('name'),
    category_id: formData.get('category_id'),
    location_id: formData.get('location_id'),
    count: formData.get('count'),
    uom: formData.get('uom'),
    desired_count: formData.get('desired_count') || null,
    reorder_point: formData.get('reorder_point') || null,
    unit_cost: formData.get('unit_cost'),
    gram_conversion: formData.get('gram_conversion') || null,
  }

  const result = npiItemSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Get category and location names for the denormalized fields
  const [categoryResult, locationResult] = await Promise.all([
    supabase.from('categories').select('name').eq('id', result.data.category_id).single(),
    supabase.from('locations').select('name').eq('id', result.data.location_id).single(),
  ])

  const { error } = await supabase
    .from('npi_items')
    .update({
      ...result.data,
      category: categoryResult.data?.name || '',
      location: locationResult.data?.name || '',
      updated_by: user?.id,
    })
    .eq('id', itemId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/inventory')
  return { success: 'Item updated successfully' }
}

export async function restockItem(
  itemId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const rawData = {
    quantity: formData.get('quantity'),
    notes: formData.get('notes') || undefined,
  }

  const result = restockSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { data, error } = await supabase.rpc('restock_item', {
    p_item_id: itemId,
    p_quantity: result.data.quantity,
    p_notes: result.data.notes,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/inventory')
  return { success: `Added ${result.data.quantity} units`, data }
}

export async function adjustStock(
  itemId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const rawData = {
    new_count: formData.get('new_count'),
    notes: formData.get('notes') || undefined,
  }

  const result = adjustStockSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { data, error } = await supabase.rpc('adjust_stock', {
    p_item_id: itemId,
    p_new_count: result.data.new_count,
    p_notes: result.data.notes,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/inventory')
  return { success: 'Stock adjusted successfully', data }
}

export async function deleteNpiItem(itemId: string): Promise<ActionState> {
  const supabase = await createClient()

  // Soft delete
  const { error } = await supabase
    .from('npi_items')
    .update({ is_active: false })
    .eq('id', itemId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/inventory')
  return { success: 'Item deleted successfully' }
}
