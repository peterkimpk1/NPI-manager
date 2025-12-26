'use client'

import { useState, useCallback } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { InventoryFiltersBar } from '@/components/inventory/inventory-filters'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { ItemFormDialog } from '@/components/inventory/item-form-dialog'
import { ReviewOnboarding } from '@/components/inventory/review-onboarding'
import { useInventory, filterItems } from '@/lib/hooks/use-inventory'
import type { NpiItem, Category, Location, SubCategory, InventoryFilters } from '@/types/inventory'
import { Button } from '@/components/ui/button'

interface InventoryContentProps {
  initialItems: NpiItem[]
  categories: Category[]
  subCategories: SubCategory[]
  locations: Location[]
}

export function InventoryContent({ initialItems, categories, subCategories, locations }: InventoryContentProps) {
  const { items, refetch } = useInventory(initialItems)
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: null,
    location: null,
    status: null,
  })
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const filteredItems = filterItems(items, filters)
  const reviewCount = items.filter(i => i.needs_review).length

  const handleReviewComplete = useCallback(() => {
    refetch()
  }, [refetch])

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <InventoryFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          locations={locations}
        />
        <div className="flex gap-2">
          {reviewCount > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowReview(true)}
              className="border-[var(--accent-yellow)] text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)]/10"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Review Queue ({reviewCount})
            </Button>
          )}
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <InventoryTable
        items={filteredItems}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
      />

      <ItemFormDialog
        open={showAddDialog}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
        onClose={() => setShowAddDialog(false)}
      />

      <ReviewOnboarding
        open={showReview}
        onOpenChange={setShowReview}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
        onComplete={handleReviewComplete}
      />
    </>
  )
}
