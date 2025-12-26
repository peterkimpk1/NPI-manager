'use client'

import Link from 'next/link'
import { Upload, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SyncStatus } from './sync-status'

interface DashboardHeaderProps {
  lastSyncTime: string | null
}

export function DashboardHeader({ lastSyncTime }: DashboardHeaderProps) {
  return (
    <header className="flex flex-wrap justify-between items-start gap-4 mb-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-text-primary">
          Command Center
        </h1>
        <p className="text-sm text-text-secondary">NPI Inventory Dashboard</p>
        <SyncStatus lastSyncTime={lastSyncTime} />
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="bg-bg-tertiary border-border-custom text-text-primary hover:bg-bg-card hover:border-border-hover"
          asChild
        >
          <Link href="/inventory?import=true">
            <Upload className="w-[18px] h-[18px] mr-2" />
            Upload CSV
          </Link>
        </Button>
        <Button
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5 transition-all duration-200"
          asChild
        >
          <Link href="/production">
            <Plus className="w-[18px] h-[18px] mr-2" />
            Log Production
          </Link>
        </Button>
      </div>
    </header>
  )
}
