export interface ActivityItem {
  id: string
  activity_type: 'production' | 'restock' | 'sync' | 'adjustment' | 'mapping'
  title: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
  created_by?: string
}

export interface SyncStatus {
  id: string
  sync_type: 'cultivera' | 'npi_import'
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  records_processed: number
  records_total: number
  error_message?: string
  started_at: string
  completed_at?: string
}

export interface DashboardStats {
  critical: number
  warning: number
  healthy: number
  stockValue: number
  criticalItems: ActionItem[]
  warningItems: ActionItem[]
}

export interface ActionItem {
  id: string
  name: string
  count: number
  desired_count: number
  location: string
  category?: string
  status: 'critical' | 'warning'
}

export interface UnmappedProduct {
  id: string
  name: string
  sku: string
  product_line?: string
}
