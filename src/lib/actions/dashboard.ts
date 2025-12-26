'use server'

import { createClient } from '@/lib/supabase/server'
import type { DashboardStats, ActivityItem, ActionItem, UnmappedProduct } from '@/types/dashboard'

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('npi_items')
    .select('id, name, count, desired_count, unit_cost, location:locations(name), category:categories(name)')
    .eq('is_active', true)

  let critical = 0
  let warning = 0
  let healthy = 0
  let stockValue = 0
  const criticalItems: ActionItem[] = []
  const warningItems: ActionItem[] = []

  ;(items || []).forEach((item: any) => {
    // Calculate stock value
    stockValue += (item.count || 0) * (item.unit_cost || 0)

    // If no desired_count set, consider healthy
    if (!item.desired_count) {
      healthy++
      return
    }

    const ratio = item.count / item.desired_count

    if (ratio <= 0.2) {
      // Critical: 20% or below of desired stock
      critical++
      criticalItems.push({
        id: item.id,
        name: item.name,
        count: item.count,
        desired_count: item.desired_count,
        location: item.location?.name || 'Unknown',
        category: item.category?.name,
        status: 'critical',
      })
    } else if (ratio <= 0.5) {
      // Warning: Between 20% and 50% of desired stock
      warning++
      warningItems.push({
        id: item.id,
        name: item.name,
        count: item.count,
        desired_count: item.desired_count,
        location: item.location?.name || 'Unknown',
        category: item.category?.name,
        status: 'warning',
      })
    } else {
      healthy++
    }
  })

  // Sort by severity (lowest ratio first)
  criticalItems.sort((a, b) => (a.count / a.desired_count) - (b.count / b.desired_count))
  warningItems.sort((a, b) => (a.count / a.desired_count) - (b.count / b.desired_count))

  return {
    critical,
    warning,
    healthy,
    stockValue,
    criticalItems: criticalItems.slice(0, 5),
    warningItems: warningItems.slice(0, 5),
  }
}

export async function getRecentActivity(limit: number = 5): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching activity:', error)
    return []
  }

  return (data || []).map(item => ({
    id: item.id,
    activity_type: item.activity_type as ActivityItem['activity_type'],
    title: item.title,
    description: item.description ?? undefined,
    metadata: item.metadata as Record<string, unknown> | undefined,
    created_at: item.created_at || new Date().toISOString(),
    created_by: item.created_by ?? undefined,
  }))
}

export async function getLastSyncTime(): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sync_status')
    .select('completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    // No sync records yet - return null gracefully
    return null
  }

  return data?.completed_at || null
}

export async function getUnmappedProducts(limit: number = 3): Promise<UnmappedProduct[]> {
  const supabase = await createClient()

  // Type assertion needed - cultivera_products table created in Sprint 3
  const { data, error } = await (supabase as any)
    .from('cultivera_products')
    .select('id, name, sku, product_line')
    .eq('is_mapped', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Table might not exist yet (Sprint 3) - return empty gracefully
    return []
  }

  return (data || []) as UnmappedProduct[]
}

export async function getUnmappedCount(): Promise<number> {
  const supabase = await createClient()

  // Type assertion needed - cultivera_products table created in Sprint 3
  const { count, error } = await (supabase as any)
    .from('cultivera_products')
    .select('*', { count: 'exact', head: true })
    .eq('is_mapped', false)

  if (error) return 0
  return count || 0
}
