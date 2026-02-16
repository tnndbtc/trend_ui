'use client'

import { useState, useEffect, useRef } from 'react'
import type { Language } from '@/types/trend'
import { useTrendFeed } from '@/hooks/useTrendFeed'
import { useCardMenu } from '@/hooks/useCardMenu'
import { FeedCard } from '@/components/FeedCard'
import { FiltersBar } from '@/components/FiltersBar'
import { LoadingCard } from '@/components/LoadingCard'
import { EmptyState } from '@/components/EmptyState'

export default function FeedPage() {
  const [language, setLanguage] = useState<Language>('en-US')

  // Menu actions (dismiss, hide source)
  const { dismissedItems, hiddenPlatforms, dismissItem, hidePlatform } = useCardMenu()

  // Feed data with client-side filtering
  const { items, loading, loadingMore, error, hasMore, fetchNext, retry } = useTrendFeed({
    dismissedItems,
    hiddenPlatforms,
  })

  console.log('[FeedPage] Render state:', { itemsCount: items.length, loading, error })

  // Ref for IntersectionObserver sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  const initialFetchDone = useRef(false)

  // Initial fetch on mount
  useEffect(() => {
    if (!initialFetchDone.current) {
      console.log('[FeedPage] useEffect running, calling fetchNext(true)')
      initialFetchDone.current = true
      fetchNext(true)
    } else {
      console.log('[FeedPage] useEffect skipping - already fetched')
    }
  }, [fetchNext])

  // Setup IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchNext(false)
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    )

    observer.observe(sentinelRef.current)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, loadingMore, loading, fetchNext])

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50">
        <FiltersBar language={language} onLanguageChange={setLanguage} />
      </div>

      {/* Feed */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {loading ? (
          // Loading skeleton
          <div className="space-y-4">
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </div>
        ) : items.length === 0 ? (
          // Empty state
          <EmptyState onRetry={() => fetchNext(true)} />
        ) : (
          // Feed with infinite scroll
          <div>
            {/* Feed items */}
            <div className="space-y-4">
              {items.map(item => (
                <FeedCard
                  key={item.id}
                  item={item}
                  language={language}
                  onDismiss={dismissItem}
                  onHidePlatform={hidePlatform}
                />
              ))}
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="py-8">
                <LoadingCard />
              </div>
            )}

            {/* Error state */}
            {error && hasMore && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <button
                  onClick={retry}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  Retry
                </button>
              </div>
            )}

            {/* End of feed */}
            {!hasMore && items.length > 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You're all caught up! 🎉</p>
                <button
                  onClick={() => fetchNext(true)}
                  className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors font-medium"
                >
                  Refresh
                </button>
              </div>
            )}

            {/* Sentinel for IntersectionObserver */}
            {hasMore && !loadingMore && !error && (
              <div ref={sentinelRef} className="h-4" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
