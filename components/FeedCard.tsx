'use client'

import Link from 'next/link'
import type { TrendItem } from '@/types/trend'
import type { Language } from '@/types/trend'
import { formatRelativeTime, truncate, getPlatformName, getBucketName, formatEngagement } from '@/lib/utils'
import { FeedbackButtons } from './FeedbackButtons'

interface FeedCardProps {
  item: TrendItem
  language: Language
}

export function FeedCard({ item, language }: FeedCardProps) {
  // Choose title and description based on language preference
  const title = language === 'en-US' ? item.canonical_title : item.title_original
  const description = language === 'en-US' ? item.canonical_description : item.description_original

  const platform = getPlatformName(item.platform)
  const bucket = getBucketName(item.bucket)
  const timeAgo = formatRelativeTime(item.published_at || item.collected_at)
  const engagement = formatEngagement(item.engagement_signals || {})

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
      {/* Badges */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary font-medium">
          {platform}
        </span>
        <span className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground">
          {bucket}
        </span>
        {item.rank_position && (
          <span className="px-2 py-1 text-xs rounded-md bg-accent text-accent-foreground">
            #{item.rank_position}
          </span>
        )}
        <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground">
          {item.region_key.toUpperCase()}
        </span>
      </div>

      {/* Title */}
      <Link href={`/item/${item.id}`}>
        <h3 className="text-lg font-semibold mb-2 hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
      </Link>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
          {truncate(description, 200)}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span>{timeAgo}</span>
        {engagement && (
          <>
            <span>•</span>
            <span>{engagement}</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <FeedbackButtons itemId={item.id} />
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          View Source →
        </a>
      </div>
    </div>
  )
}
