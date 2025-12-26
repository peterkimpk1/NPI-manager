'use client'

import { Package, CheckCircle, Clock, AlertTriangle, DollarSign } from 'lucide-react'
import type { InventoryStats } from '@/types/inventory'

interface StatsBarProps {
  stats: InventoryStats
}

export function StatsBar({ stats }: StatsBarProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(2)}`
  }

  const statItems = [
    {
      label: 'Total Items',
      value: stats.total,
      icon: Package,
      colorClass: 'bg-cyan-500/10 text-cyan-500',
      valueClass: 'text-cyan-500',
    },
    {
      label: 'In Stock',
      value: stats.healthy,
      icon: CheckCircle,
      colorClass: 'bg-green-500/10 text-green-500',
      valueClass: 'text-green-500',
    },
    {
      label: 'Low Stock',
      value: stats.warning,
      icon: Clock,
      colorClass: 'bg-yellow-500/10 text-yellow-500',
      valueClass: 'text-yellow-500',
    },
    {
      label: 'Critical',
      value: stats.critical,
      icon: AlertTriangle,
      colorClass: 'bg-red-500/10 text-red-500',
      valueClass: 'text-red-500',
    },
    {
      label: 'Stock Value',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      colorClass: 'bg-purple-500/10 text-purple-500',
      valueClass: 'text-purple-500',
      isText: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--border-hover)] transition-all"
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.colorClass}`}
          >
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <div className={`font-mono text-2xl font-bold tracking-tight ${stat.valueClass}`}>
              {stat.value}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
