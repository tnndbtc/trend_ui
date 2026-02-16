'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Language } from '@/types/trend'
import { Virtuoso } from 'react-virtuoso'
import { useTrendFeed } from '@/hooks/useTrendFeed'
import { useCardMenu } from '@/hooks/useCardMenu'
import { useScrollRestoration } from '@/hooks/useScrollRestoration'
import { FeedCard } from '@/components/FeedCard'
import { FiltersBar } from '@/components/FiltersBar'
import { LoadingCard } from '@/components/LoadingCard'
import { EmptyState } from '@/components/EmptyState'
import { CaughtUpState } from '@/components/CaughtUpState'

// Threshold for switching to virtualized rendering
const VIRTUALIZATION_THRESHOLD = 500

export default function FeedPage() {
  const [language, setLanguage] = useState<Language>('en-US')
  const [feedStartTime, setFeedStartTime] = useState<Date>(new Date())

  // Menu actions (dismiss, hide source)
  const { dismissedItems, hiddenPlatforms, dismissItem, hidePlatform } = useCardMenu()

  // Feed data with client-side filtering
  const { items, loading, loadingMore, error, hasMore, fetchNext, retry } = useTrendFeed({
    dismissedItems,
    hiddenPlatforms,
    language,
  })

  // Scroll restoration for session continuity
  const scrollRestoration = useScrollRestoration({
    items,
    cursor: null, // We'll integrate cursor if needed
    shouldRestore: true,
  })

  console.log('[FeedPage] Render state:', {
    itemsCount: items.length,
    loading,
    error,
    shouldRestore: scrollRestoration.shouldRestoreItems
  })

  // Ref for IntersectionObserver sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  const initialFetchDone = useRef(false)
  const prevLanguage = useRef<Language | null>(null)

  // Initial fetch on mount
  useEffect(() => {
    if (!initialFetchDone.current) {
      console.log('[FeedPage] useEffect running, calling fetchNext(true)')
      initialFetchDone.current = true
      prevLanguage.current = language
      fetchNext(true)
    } else {
      console.log('[FeedPage] useEffect skipping - already fetched')
    }
  }, [fetchNext])

  // Refetch when language changes (but not on initial mount)
  useEffect(() => {
    if (initialFetchDone.current && prevLanguage.current !== null && prevLanguage.current !== language) {
      console.log('[FeedPage] Language changed from', prevLanguage.current, 'to', language, '- refetching')
      prevLanguage.current = language
      scrollRestoration.clearSession() // Clear session on filter change
      setFeedStartTime(new Date())
      fetchNext(true)
    }
  }, [language, fetchNext, scrollRestoration])

  // Determine if virtualization should be used
  const useVirtualization = items.length > VIRTUALIZATION_THRESHOLD

  // Callback for Virtuoso to load more items
  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading && !error) {
      console.log('[FeedPage] Virtuoso endReached - fetching next page')
      fetchNext(false)
    }
  }, [hasMore, loadingMore, loading, error, fetchNext])

  // Setup IntersectionObserver for infinite scroll (non-virtualized mode)
  useEffect(() => {
    if (useVirtualization || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          console.log('[FeedPage] Sentinel triggered - fetching next page')
          fetchNext(false)
        }
      },
      {
        root: null,
        rootMargin: '600px', // Early preload when within 600px
        threshold: 0.1,
      }
    )

    observer.observe(sentinelRef.current)

    return () => {
      observer.disconnect()
    }
  }, [useVirtualization, hasMore, loadingMore, loading, fetchNext])

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50">
        <FiltersBar language={language} onLanguageChange={setLanguage} />
      </div>

      {/* Feed */}
      <div className="feed-container">
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
        ) : useVirtualization ? (
          // Virtualized feed for >500 items
          <Virtuoso
            data={items}
            endReached={loadMore}
            overscan={300}
            itemContent={(index, item) => (
              <div className="pb-4" key={item.id}>
                <FeedCard
                  item={item}
                  language={language}
                  onDismiss={dismissItem}
                  onHidePlatform={hidePlatform}
                />
              </div>
            )}
            components={{
              Footer: () => (
                <>
                  {loadingMore && (
                    <div className="py-8">
                      <LoadingCard />
                    </div>
                  )}
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
                  {!hasMore && items.length > 0 && (
                    <CaughtUpState
                      lastUpdated={feedStartTime}
                      onRefresh={() => {
                        setFeedStartTime(new Date())
                        scrollRestoration.clearSession()
                        fetchNext(true)
                      }}
                    />
                  )}
                </>
              ),
            }}
          />
        ) : (
          // Regular feed for <500 items
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

            {/* End of feed - Caught Up State */}
            {!hasMore && items.length > 0 && (
              <CaughtUpState
                lastUpdated={feedStartTime}
                onRefresh={() => {
                  setFeedStartTime(new Date())
                  scrollRestoration.clearSession()
                  fetchNext(true)
                }}
              />
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
