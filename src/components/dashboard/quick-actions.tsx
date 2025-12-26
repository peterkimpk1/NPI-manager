'use client'

import Link from 'next/link'
import { Wrench, RefreshCw, ChevronRight } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      title: 'Log Production',
      description: 'Record units & auto-deplete NPI',
      icon: Wrench,
      href: '/production',
      gradient: 'bg-gradient-to-br from-accent-green to-green-700',
    },
    {
      title: 'Sync Cultivera',
      description: 'Upload product list CSV',
      icon: RefreshCw,
      href: '/products?sync=true',
      gradient: 'bg-gradient-to-br from-accent-purple to-purple-700',
    },
  ]

  return (
    <div className="bg-bg-card border border-border-custom rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border-custom">
        <h2 className="font-semibold text-[16px]">Quick Actions</h2>
      </div>

      {/* Actions */}
      <div className="p-5 space-y-3">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="group flex items-center gap-4 p-5 bg-bg-tertiary border border-border-custom rounded-xl hover:border-border-hover hover:translate-x-1 transition-all duration-200"
          >
            {/* Icon */}
            <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center flex-shrink-0 ${action.gradient}`}>
              <action.icon className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="font-semibold text-[15px] text-text-primary">
                {action.title}
              </div>
              <div className="text-[13px] text-text-muted">
                {action.description}
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-secondary group-hover:translate-x-1 transition-all duration-200" />
          </Link>
        ))}
      </div>
    </div>
  )
}
