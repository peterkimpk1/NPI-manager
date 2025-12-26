'use client'

import { formatDistanceToNow } from 'date-fns'

interface SyncStatusProps {
  lastSyncTime: string | null
}

export function SyncStatus({ lastSyncTime }: SyncStatusProps) {
  const displayText = lastSyncTime
    ? `Last sync: ${formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}`
    : 'Never synced'

  return (
    <div className="inline-flex items-center gap-1.5 bg-accent-green-dim text-accent-green px-3 py-1 rounded-full text-xs font-medium font-mono mt-2">
      <span className="w-1.5 h-1.5 bg-accent-green rounded-full animate-pulse" />
      {displayText}
    </div>
  )
}
