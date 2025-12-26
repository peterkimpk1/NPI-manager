import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatusCards } from '@/components/dashboard/status-cards'
import { ActionRequired } from '@/components/dashboard/action-required'
import { UnmappedPreview } from '@/components/dashboard/unmapped-preview'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import {
  getDashboardStats,
  getRecentActivity,
  getLastSyncTime,
  getUnmappedProducts,
  getUnmappedCount,
} from '@/lib/actions/dashboard'

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [stats, activities, lastSync, unmappedProducts, unmappedCount] = await Promise.all([
    getDashboardStats(),
    getRecentActivity(5),
    getLastSyncTime(),
    getUnmappedProducts(2),
    getUnmappedCount(),
  ])

  return (
    <div className="space-y-6">
      {/* Header with sync status and action buttons */}
      <DashboardHeader lastSyncTime={lastSync} />

      {/* Status Cards: Critical, Warning, Healthy, Stock Value */}
      <StatusCards stats={stats} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left Column: Action Required + Unmapped Products */}
        <div className="space-y-6">
          <ActionRequired
            criticalItems={stats.criticalItems}
            warningItems={stats.warningItems}
          />
          <UnmappedPreview
            products={unmappedProducts}
            totalCount={unmappedCount}
          />
        </div>

        {/* Right Column: Quick Actions + Activity Feed */}
        <div className="space-y-6">
          <QuickActions />
          <ActivityFeed activities={activities} />
        </div>
      </div>
    </div>
  )
}
