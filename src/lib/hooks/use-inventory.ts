'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NpiItem, InventoryFilters, StockStatus } from '@/types/inventory'

export function useInventory(initialItems: NpiItem[]) {
  const [items, setItems] = useState<NpiItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel('npi_items_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'npi_items' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch with joins
            const { data } = await supabase
              .from('npi_items')
              .select('*, category:categories(*), location:locations(*)')
              .eq('id', payload.new.id)
              .single()
            if (data) setItems(prev => [...prev, data as NpiItem])
          } else if (payload.eventType === 'UPDATE') {
            const { data } = await supabase
              .from('npi_items')
              .select('*, category:categories(*), location:locations(*)')
              .eq('id', payload.new.id)
              .single()
            if (data) {
              setItems(prev => prev.map(item =>
                item.id === data.id ? (data as NpiItem) : item
              ))
            }
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return { items, setItems, isLoading }
}

export function getStockStatus(count: number, desired?: number | null): StockStatus {
  if (!desired || desired === 0) return 'healthy'
  const ratio = count / desired
  if (ratio <= 0.2) return 'critical'
  if (ratio <= 0.5) return 'warning'
  return 'healthy'
}

export function filterItems(
  items: NpiItem[],
  filters: InventoryFilters
): NpiItem[] {
  return items.filter(item => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!item.name.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Category filter
    if (filters.category && item.category_id !== filters.category) {
      return false
    }

    // Location filter
    if (filters.location && item.location_id !== filters.location) {
      return false
    }

    // Status filter
    if (filters.status) {
      const status = getStockStatus(item.count, item.desired_count)
      if (status !== filters.status) {
        return false
      }
    }

    return true
  })
}
