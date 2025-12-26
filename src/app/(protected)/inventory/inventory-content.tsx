'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { InventoryFiltersBar } from '@/components/inventory/inventory-filters'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { ItemFormDialog } from '@/components/inventory/item-form-dialog'
import { useInventory, filterItems } from '@/lib/hooks/use-inventory'
import type { NpiItem, Category, Location, InventoryFilters } from '@/types/inventory'
import { Button } from '@/components/ui/button'

interface InventoryContentProps {
  initialItems: NpiItem[]
  categories: Category[]
  locations: Location[]
}

export function InventoryContent({ initialItems, categories, locations }: InventoryContentProps) {
  const { items } = useInventory(initialItems)
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: null,
    location: null,
    status: null,
  })
  const [showAddDialog, setShowAddDialog] = useState(false)

  const filteredItems = filterItems(items, filters)

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-3">
        <InventoryFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          locations={locations}
        />
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      <InventoryTable
        items={filteredItems}
        categories={categories}
        locations={locations}
      />

      <ItemFormDialog
        open={showAddDialog}
        categories={categories}
        locations={locations}
        onClose={() => setShowAddDialog(false)}
      />
    </>
  )
}
