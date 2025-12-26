'use client'

import Link from 'next/link'
import { MapPin, Package, Tag, Droplets, ChevronRight, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ActionItem } from '@/types/dashboard'

interface ActionRequiredProps {
  criticalItems: ActionItem[]
  warningItems: ActionItem[]
}

export function ActionRequired({ criticalItems, warningItems }: ActionRequiredProps) {
  const allItems = [...criticalItems, ...warningItems].slice(0, 5)
  const totalCount = criticalItems.length + warningItems.length

  // Determine icon based on item name or category
  const getIcon = (item: ActionItem) => {
    const name = item.name.toLowerCase()
    const category = item.category?.toLowerCase() || ''

    if (name.includes('label') || category.includes('label')) return Tag
    if (name.includes('oil') || name.includes('mct') || category.includes('ingredient')) return Droplets
    return Package
  }

  return (
    <div className="bg-bg-card border border-border-custom rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-border-custom">
        <h2 className="font-semibold text-[16px] flex items-center gap-2.5">
          Action Required
          <Badge className="bg-accent-red-dim text-accent-red border-0 font-mono text-xs px-2 py-0.5 rounded-md">
            {totalCount}
          </Badge>
        </h2>
        <Link
          href="/inventory?status=critical"
          className="text-[13px] text-accent-cyan hover:underline flex items-center gap-1 font-medium"
        >
          View All
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Items list */}
      <div className="p-2">
        {allItems.map((item) => {
          const Icon = getIcon(item)
          const isCritical = item.status === 'critical'

          return (
            <Link
              key={item.id}
              href={`/inventory?search=${encodeURIComponent(item.name)}`}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-bg-tertiary transition-all duration-200 border border-transparent"
            >
              {/* Icon */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isCritical
                  ? 'bg-accent-red-dim text-accent-red'
                  : 'bg-accent-yellow-dim text-accent-yellow'
              }`}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-text-primary truncate">
                  {item.name}
                </div>
                <div className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {item.location}
                </div>
              </div>

              {/* Stock info */}
              <div className="text-right flex-shrink-0">
                <div className={`font-mono text-sm font-semibold ${
                  isCritical ? 'text-accent-red' : 'text-accent-yellow'
                }`}>
                  {item.count}
                </div>
                <div className="text-[11px] text-text-muted">
                  of {item.desired_count} min
                </div>
              </div>
            </Link>
          )
        })}

        {/* Empty state */}
        {allItems.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-bg-tertiary rounded-2xl flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-accent-green" />
            </div>
            <div className="text-sm font-medium text-text-primary">All items well stocked!</div>
            <div className="text-xs text-text-muted mt-1">No action required at this time</div>
          </div>
        )}
      </div>
    </div>
  )
}
