'use client'

import { formatRelativeTime } from '@/lib/utils'

interface CaughtUpStateProps {
  onRefresh?: () => void
  lastUpdated?: Date
}

export function CaughtUpState({ onRefresh, lastUpdated }: CaughtUpStateProps) {
  const timestamp = lastUpdated ? formatRelativeTime(lastUpdated.toISOString()) : 'just now'

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-6xl mb-4">✨</div>
      <h3 className="text-xl font-semibold mb-2">You're all caught up!</h3>
      <p className="text-muted-foreground mb-1 max-w-md">
        You've reached the end of your feed.
      </p>
      <p className="text-sm text-muted-foreground/70 mb-6">
        Last updated {timestamp}
      </p>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors font-medium"
        >
          Refresh Feed
        </button>
      )}
    </div>
  )
}
