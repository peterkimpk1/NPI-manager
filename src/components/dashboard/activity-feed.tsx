'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { ActivityItem } from '@/types/dashboard'

interface ActivityFeedProps {
  activities: ActivityItem[]
}

const activityColors: Record<string, string> = {
  production: 'bg-accent-green',
  restock: 'bg-accent-cyan',
  sync: 'bg-accent-purple',
  adjustment: 'bg-accent-yellow',
  mapping: 'bg-accent-cyan',
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-bg-card border border-border-custom rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-5 border-b border-border-custom">
        <h2 className="font-semibold text-[16px]">Recent Activity</h2>
        <Link
          href="/reports"
          className="text-[13px] text-accent-cyan hover:underline font-medium"
        >
          View All
        </Link>
      </div>

      {/* Activity list */}
      <div className="p-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex gap-3 px-4 py-3.5 rounded-xl hover:bg-bg-tertiary transition-colors duration-200"
          >
            {/* Dot indicator */}
            <div
              className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                activityColors[activity.activity_type] || 'bg-text-muted'
              }`}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-text-primary">
                <strong className="font-semibold">{activity.title}</strong>
                {activity.description && (
                  <span className="text-text-secondary"> {activity.description}</span>
                )}
              </div>
              <div className="text-[11px] text-text-muted font-mono mt-0.5">
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {activities.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="text-sm text-text-muted">No recent activity</div>
          </div>
        )}
      </div>
    </div>
  )
}
