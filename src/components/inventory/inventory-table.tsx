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
import type { NpiItem, Category, Location } from '@/types/inventory'
import { getStockStatus } from '@/lib/hooks/use-inventory'

interface InventoryTableProps {
  items: NpiItem[]
  categories: Category[]
  locations: Location[]
}

type SortField = 'name' | 'count' | 'desired_count' | 'unit_cost' | 'stockValue'
type SortDirection = 'asc' | 'desc'

export function InventoryTable({ items, categories, locations }: InventoryTableProps) {
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
      case 'stockValue':
        aVal = a.count * a.unit_cost
        bVal = b.count * b.unit_cost
        break
      case 'desired_count':
        aVal = a.desired_count ?? 0
        bVal = b.desired_count ?? 0
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

  const formatCurrency = (value: number) => {
    return value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(3)}`
  }

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
                <SortableHeader field="desired_count">Desired</SortableHeader>
                <TableHead>Location</TableHead>
                <SortableHeader field="unit_cost">Unit Cost</SortableHeader>
                <SortableHeader field="stockValue">Stock Value</SortableHeader>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => {
                const status = getStockStatus(item.count, item.desired_count)
                const stockValue = item.count * item.unit_cost
                const barWidth = getStockBarWidth(item.count, item.desired_count)

                return (
                  <TableRow key={item.id} className="border-[var(--border)] hover:bg-[var(--bg-tertiary)]">
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[11px] uppercase tracking-wide ${getCategoryStyles(item.category || '')}`}
                      >
                        {item.category}
                      </Badge>
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
                    <TableCell className="font-mono">
                      {item.desired_count?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm">
                        <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {item.location}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-[var(--text-secondary)]">
                      {formatCurrency(item.unit_cost)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-purple-500">
                      {formatCurrency(stockValue)}
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
        locations={locations}
        onClose={() => setEditItem(null)}
      />
    </>
  )
}
