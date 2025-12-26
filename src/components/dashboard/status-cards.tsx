'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle, DollarSign } from 'lucide-react'
import type { DashboardStats } from '@/types/dashboard'

interface StatusCardsProps {
  stats: DashboardStats
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K'
  }
  return '$' + value.toFixed(2)
}

export function StatusCards({ stats }: StatusCardsProps) {
  const cards = [
    {
      label: 'Critical Stock',
      sublabel: 'Below reorder point',
      value: stats.critical,
      icon: AlertTriangle,
      gradient: 'from-accent-red',
      iconBg: 'bg-accent-red-dim',
      iconColor: 'text-accent-red',
      valueColor: 'text-accent-red',
      href: '/inventory?status=critical',
    },
    {
      label: 'Running Low',
      sublabel: 'Within 50% of threshold',
      value: stats.warning,
      icon: Clock,
      gradient: 'from-accent-yellow',
      iconBg: 'bg-accent-yellow-dim',
      iconColor: 'text-accent-yellow',
      valueColor: 'text-accent-yellow',
      href: '/inventory?status=warning',
    },
    {
      label: 'Healthy Stock',
      sublabel: 'Above desired levels',
      value: stats.healthy,
      icon: CheckCircle,
      gradient: 'from-accent-green',
      iconBg: 'bg-accent-green-dim',
      iconColor: 'text-accent-green',
      valueColor: 'text-accent-green',
      href: '/inventory?status=healthy',
    },
    {
      label: 'Stock Value',
      sublabel: 'Total NPI assets',
      value: formatCurrency(stats.stockValue),
      icon: DollarSign,
      gradient: 'from-accent-purple',
      iconBg: 'bg-accent-purple-dim',
      iconColor: 'text-accent-purple',
      valueColor: 'text-accent-purple',
      href: '/inventory',
      isFormatted: true,
    },
  ]

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="group bg-bg-card border border-border-custom rounded-2xl p-6 relative overflow-hidden transition-all duration-200 hover:border-border-hover hover:-translate-y-0.5"
        >
          {/* Top gradient border */}
          <div
            className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${card.gradient} to-transparent`}
          />

          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.iconBg} ${card.iconColor}`}>
            <card.icon className="w-6 h-6" />
          </div>

          {/* Value */}
          <div className={`text-[42px] font-bold font-mono tracking-[-2px] leading-none mb-1 ${card.valueColor}`}>
            {card.value}
          </div>

          {/* Labels */}
          <div className="text-sm font-medium text-text-secondary">{card.label}</div>
          <div className="text-xs text-text-muted mt-0.5">{card.sublabel}</div>
        </Link>
      ))}
    </section>
  )
}
