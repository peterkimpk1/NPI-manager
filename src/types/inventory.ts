export interface Category {
  id: string
  name: string
  color: string
  icon: string | null
  created_at: string | null
}

export interface Location {
  id: string
  name: string
  description: string | null
  created_at: string | null
}

export interface SubCategory {
  id: string
  name: string
  category_id: string
  created_at: string | null
}

export interface NpiItem {
  id: string
  name: string
  category: string
  category_id: string | null
  sub_category_id: string | null
  sub_category_name?: string | null
  location: string | null
  location_id: string | null
  count: number
  uom: string
  pkg_size: number | null
  price: number | null
  desired_count: number | null
  reorder_point: number | null
  unit_cost: number
  lead_time: string | null
  source: string | null
  staff: string | null
  gram_conversion: number | null
  notes: string | null
  needs_review: boolean | null
  review_source: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  updated_by: string | null
}

export interface StockMovement {
  id: string
  npi_item_id: string | null
  quantity: number
  previous_count: number
  new_count: number
  movement_type: 'restock' | 'adjustment' | 'production' | 'initial'
  reference_id: string | null
  notes: string | null
  created_at: string | null
  created_by: string | null
}

export type StockStatus = 'healthy' | 'warning' | 'critical'

export interface InventoryFilters {
  search: string
  category: string | null
  subCategory: string | null
  location: string | null
  status: StockStatus | null
}

export interface InventoryStats {
  total: number
  healthy: number
  warning: number
  critical: number
  totalValue: number
}
