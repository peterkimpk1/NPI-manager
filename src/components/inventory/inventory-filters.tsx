'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category, Location, SubCategory, InventoryFilters, StockStatus } from '@/types/inventory'
import { useMemo } from 'react'

interface InventoryFiltersProps {
  filters: InventoryFilters
  onFiltersChange: (filters: InventoryFilters) => void
  categories: Category[]
  subCategories: SubCategory[]
  locations: Location[]
}

export function InventoryFiltersBar({
  filters,
  onFiltersChange,
  categories,
  subCategories,
  locations,
}: InventoryFiltersProps) {
  const hasActiveFilters = filters.category || filters.subCategory || filters.location || filters.status

  // Filter sub-categories based on selected category
  const filteredSubCategories = useMemo(() => {
    if (!filters.category) return []
    return subCategories.filter(sc => sc.category_id === filters.category)
  }, [subCategories, filters.category])

  const clearFilters = () => {
    onFiltersChange({
      search: filters.search,
      category: null,
      subCategory: null,
      location: null,
      status: null,
    })
  }

  // Handle category change - clear sub-category when category changes
  const handleCategoryChange = (value: string) => {
    onFiltersChange({
      ...filters,
      category: value === 'all' ? null : value,
      subCategory: null, // Clear sub-category when category changes
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 flex-1">
      {/* Search */}
      <div className="relative flex-1 min-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <Input
          placeholder="Search inventory items..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-cyan-500"
        />
      </div>

      {/* Category Filter */}
      <Select
        value={filters.category || 'all'}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger className="w-[160px] bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sub-Category Filter - only shows when category is selected */}
      {filters.category && filteredSubCategories.length > 0 && (
        <Select
          value={filters.subCategory || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, subCategory: value === 'all' ? null : value })
          }
        >
          <SelectTrigger className="w-[180px] bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]">
            <SelectValue placeholder="Sub-Category" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
            <SelectItem value="all">All Sub-Categories</SelectItem>
            {filteredSubCategories.map((subCat) => (
              <SelectItem key={subCat.id} value={subCat.id}>
                {subCat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Location Filter */}
      <Select
        value={filters.location || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, location: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[180px] bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value === 'all' ? null : value as StockStatus })
        }
      >
        <SelectTrigger className="w-[140px] bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="healthy">In Stock</SelectItem>
          <SelectItem value="warning">Low Stock</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  )
}
