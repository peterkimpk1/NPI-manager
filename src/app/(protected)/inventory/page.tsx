import { Suspense } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatsBar } from '@/components/inventory/stats-bar'
import { InventoryContent } from './inventory-content'
import { getInventoryItems, getCategories, getLocations, getInventoryStats } from '@/lib/actions/inventory'

export default async function InventoryPage() {
  const [items, categories, locations] = await Promise.all([
    getInventoryItems(),
    getCategories(),
    getLocations(),
  ])

  const stats = await getInventoryStats(items)

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory Management</h1>
          <p className="text-[var(--text-secondary)]">Non-Product Inventory Tracking</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="bg-[var(--bg-tertiary)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-card)]">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <StatsBar stats={stats} />

      <Suspense fallback={<div className="text-[var(--text-muted)]">Loading...</div>}>
        <InventoryContent
          initialItems={items}
          categories={categories}
          locations={locations}
        />
      </Suspense>
    </div>
  )
}
