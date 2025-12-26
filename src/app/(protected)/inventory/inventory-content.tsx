'use client'

import { useState } from 'react'
import { InventoryFiltersBar } from '@/components/inventory/inventory-filters'
import { InventoryTable } from '@/components/inventory/inventory-table'
import { useInventory, filterItems } from '@/lib/hooks/use-inventory'
import type { NpiItem, Category, Location, SubCategory, InventoryFilters } from '@/types/inventory'

interface InventoryContentProps {
  initialItems: NpiItem[]
  categories: Category[]
  subCategories: SubCategory[]
  locations: Location[]
}

export function InventoryContent({ initialItems, categories, subCategories, locations }: InventoryContentProps) {
  const { items } = useInventory(initialItems)
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: null,
    subCategory: null,
    location: null,
    status: null,
  })

  const filteredItems = filterItems(items, filters)

  return (
    <>
      <InventoryFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
      />

      <InventoryTable
        items={filteredItems}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
      />
    </>
  )
}
