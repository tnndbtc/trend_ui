'use client'

import { useState, useCallback } from 'react'
import type { TrendItem, Language } from '@/types/trend'
import { formatRelativeTime, truncate, formatEngagement, getPlatformName, getBucketName, getRegionName } from '@/lib/utils'
import { useCardTracking, useTracking } from '@/hooks/useTracking'

interface FeedCardProps {
  item: TrendItem
  language: Language
  onDismiss?: (itemId: string) => void
  onHidePlatform?: (platform: string) => void
}

export function FeedCard({ item, language, onDismiss, onHidePlatform }: FeedCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { trackClick } = useTracking()

  // Use display_title and display_description from API (language-aware)
  const title = item.display_title
  const description = item.display_description

  const timeAgo = formatRelativeTime(item.published_at || item.collected_at)
  const engagement = formatEngagement(item.engagement_signals || {})

  // Track impression and dwell time
  const cardRef = useCardTracking(
    item.id.toString(),
    item.platform,
    true
  )

  const handleClick = useCallback(() => {
    trackClick(item.id.toString(), item.url, item.platform)
  }, [item.id, item.url, item.platform, trackClick])

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onDismiss?.(item.id.toString())
  }, [item.id, onDismiss])

  const handleHidePlatform = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onHidePlatform?.(item.platform)
  }, [item.platform, onHidePlatform])

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }, [menuOpen])

  return (
    <article
      ref={cardRef as React.RefObject<HTMLElement>}
      className="relative border rounded-lg p-5 hover:shadow-lg hover:border-primary/20 transition-all bg-card"
    >
      {/* Menu Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleMenu}
          className="p-2 hover:bg-secondary rounded-md transition-colors"
          aria-label="Menu"
        >
          <span className="text-lg leading-none">⋯</span>
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />

            {/* Menu */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-md shadow-lg z-20">
              <button
                onClick={handleDismiss}
                className="w-full text-left px-4 py-2 hover:bg-secondary text-sm transition-colors"
              >
                Not interested
              </button>
              <button
                onClick={handleHidePlatform}
                className="w-full text-left px-4 py-2 hover:bg-secondary text-sm transition-colors border-t"
              >
                Hide source ({item.platform})
              </button>
            </div>
          </>
        )}
      </div>

      {/* Clickable Card Content */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block pr-8 group"
      >
        {/* Source Badges */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
            {getPlatformName(item.platform)}
          </span>
          {item.bucket && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
              {getBucketName(item.bucket)}
            </span>
          )}
          {item.region_key && item.region_key !== 'all' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
              {getRegionName(item.region_key)}
            </span>
          )}
        </div>

        {/* Title - Optimized for readability */}
        <h3 className="text-xl font-bold mb-2.5 leading-snug group-hover:text-primary transition-colors line-clamp-3">
          {title}
        </h3>

        {/* Description - More prominent for text-heavy cards */}
        {description && (
          <p className="text-base text-foreground/80 mb-3 leading-relaxed line-clamp-4">
            {description}
          </p>
        )}

        {/* Metadata Footer */}
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">{timeAgo}</span>
          {engagement && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>{engagement}</span>
            </>
          )}
        </div>
      </a>
    </article>
  )
}
