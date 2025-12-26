import { Suspense } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsBar } from '@/components/inventory/stats-bar'
import { InventoryContent } from './inventory-content'
import { InventoryHeaderActions } from '@/components/inventory/inventory-header-actions'
import { getInventoryItems, getCategories, getLocations, getSubCategories, getInventoryStats } from '@/lib/actions/inventory'

export default async function InventoryPage() {
  const [items, categories, subCategories, locations] = await Promise.all([
    getInventoryItems(),
    getCategories(),
    getSubCategories(),
    getLocations(),
  ])

  const stats = await getInventoryStats(items)
  const reviewCount = items.filter(i => i.needs_review).length

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
          <p className="text-[var(--text-secondary)]">Non-Product Inventory Tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="cursor-pointer bg-bg-tertiary border-border text-text-primary hover:bg-bg-card hover:border-border-hover transition-colors duration-200">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <InventoryHeaderActions
            reviewCount={reviewCount}
            categories={categories}
            subCategories={subCategories}
            locations={locations}
          />
        </div>
      </header>

      <StatsBar stats={stats} />

      <Suspense fallback={<div className="text-[var(--text-muted)]">Loading...</div>}>
        <InventoryContent
          initialItems={items}
          categories={categories}
          subCategories={subCategories}
          locations={locations}
        />
      </Suspense>
    </div>
  )
}
