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

export interface NpiItem {
  id: string
  name: string
  category: string
  category_id: string | null
  location: string | null
  location_id: string | null
  count: number
  uom: string
  desired_count: number | null
  reorder_point: number | null
  unit_cost: number
  gram_conversion: number | null
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
