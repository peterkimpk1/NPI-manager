'use client'

import { useState } from 'react'
import { MapPin, Pencil, Plus, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RestockDialog } from './restock-dialog'
import { ItemFormDialog } from './item-form-dialog'
import type { NpiItem, Category, Location, SubCategory } from '@/types/inventory'
import { getStockStatus } from '@/lib/hooks/use-inventory'

interface InventoryTableProps {
  items: NpiItem[]
  categories: Category[]
  subCategories: SubCategory[]
  locations: Location[]
}

type SortField = 'name' | 'count' | 'updated_at'
type SortDirection = 'asc' | 'desc'

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function InventoryTable({ items, categories, subCategories, locations }: InventoryTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [restockItem, setRestockItem] = useState<NpiItem | null>(null)
  const [editItem, setEditItem] = useState<NpiItem | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedItems = [...items].sort((a, b) => {
    let aVal: string | number, bVal: string | number

    switch (sortField) {
      case 'updated_at':
        aVal = a.updated_at ? new Date(a.updated_at).getTime() : 0
        bVal = b.updated_at ? new Date(b.updated_at).getTime() : 0
        break
      case 'count':
        aVal = a.count
        bVal = b.count
        break
      default:
        aVal = a[sortField]
        bVal = b[sortField]
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal)
    }

    return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal
  })

  const getStockBarWidth = (count: number, desired?: number | null) => {
    if (!desired || desired === 0) return 100
    return Math.min((count / desired) * 100, 100)
  }

  const getCategoryStyles = (categoryName: string) => {
    const styles: Record<string, string> = {
      Ingredients: 'bg-green-500/15 text-green-400',
      Packaging: 'bg-cyan-500/15 text-cyan-400',
      Labels: 'bg-purple-500/15 text-purple-400',
      Supplies: 'bg-orange-500/15 text-orange-400',
    }
    return styles[categoryName] || 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-[var(--text-primary)]'
    }
  }

  const getStatusBarColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-[var(--text-muted)]'
    }
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:text-[var(--text-secondary)] transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-cyan-500' : 'opacity-50'}`} />
      </div>
    </TableHead>
  )

  return (
    <>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--bg-tertiary)] border-[var(--border)] hover:bg-[var(--bg-tertiary)]">
                <SortableHeader field="name">Item Name</SortableHeader>
                <TableHead>Category</TableHead>
                <SortableHeader field="count">Stock</SortableHeader>
                <TableHead>UOM</TableHead>
                <SortableHeader field="updated_at">Last Update</SortableHeader>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => {
                const status = getStockStatus(item.count, item.desired_count)
                const barWidth = getStockBarWidth(item.count, item.desired_count)

                return (
                  <TableRow key={item.id} className="border-[var(--border)] hover:bg-[var(--bg-tertiary)]">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-[11px] uppercase tracking-wide w-fit ${getCategoryStyles(item.category || '')}`}
                        >
                          {item.category}
                        </Badge>
                        {item.sub_category_name && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {item.sub_category_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className={`font-mono font-semibold ${getStatusColor(status)}`}>
                          {item.count.toLocaleString()}
                        </span>
                        <div className="w-20 h-1.5 bg-[var(--bg-tertiary)] rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getStatusBarColor(status)}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[var(--text-muted)] lowercase">
                      {item.uom}
                    </TableCell>
                    <TableCell className="text-sm text-[var(--text-muted)]">
                      {formatRelativeTime(item.updated_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {item.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--text-muted)] hover:text-cyan-500 hover:bg-cyan-500/10"
                          onClick={() => setEditItem(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-[var(--text-muted)] hover:text-green-500 hover:bg-green-500/10"
                          onClick={() => setRestockItem(item)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-tertiary)]">
          <span className="text-sm text-[var(--text-muted)]">
            Showing <strong className="text-[var(--text-secondary)]">{items.length}</strong> items
          </span>
        </div>
      </div>

      {/* Dialogs */}
      <RestockDialog
        item={restockItem}
        onClose={() => setRestockItem(null)}
      />
      <ItemFormDialog
        item={editItem}
        categories={categories}
        subCategories={subCategories}
        locations={locations}
        onClose={() => setEditItem(null)}
      />
    </>
  )
}
