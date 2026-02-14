'use client'

import { useState, useEffect } from 'react'
import type { TrendItem, FeedFilters } from '@/types/trend'
import { fetchTrends } from '@/lib/api/trends'
import { FeedCard } from '@/components/FeedCard'
import { FiltersBar } from '@/components/FiltersBar'
import { LoadingCard } from '@/components/LoadingCard'
import { EmptyState } from '@/components/EmptyState'

export default function FeedPage() {
  const [filters, setFilters] = useState<FeedFilters>({
    language: 'en-US',
    buckets: [],
    surprise: false,
  })

  const [items, setItems] = useState<TrendItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    loadTrends(true)
  }, [filters.region, filters.buckets, filters.surprise])

  const loadTrends = async (reset = false) => {
    if (reset) {
      setIsLoading(true)
      setItems([])
      setCursor(null)
    } else {
      setIsLoadingMore(true)
    }

    try {
      const response = await fetchTrends({
        ...filters,
        limit: 20,
        cursor: reset ? undefined : cursor || undefined,
      })

      setItems(prev => reset ? response.items : [...prev, ...response.items])
      setCursor(response.next_cursor || null)
      setHasMore(!!response.next_cursor)
    } catch (error) {
      console.error('Failed to load trends:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Filter items client-side by search
  const filteredItems = filters.search
    ? items.filter(item => {
        const searchLower = filters.search!.toLowerCase()
        const title = (filters.language === 'en-US' ? item.canonical_title : item.title_original).toLowerCase()
        return title.includes(searchLower)
      })
    : items

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Filters */}
      <FiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Feed */}
      <div className="mt-6 space-y-4">
        {isLoading ? (
          // Loading skeleton
          <>
            <LoadingCard />
            <LoadingCard />
            <LoadingCard />
          </>
        ) : filteredItems.length === 0 ? (
          // Empty state
          <EmptyState onRetry={() => loadTrends(true)} />
        ) : (
          // Feed items
          <>
            {filteredItems.map(item => (
              <FeedCard key={item.id} item={item} language={filters.language} />
            ))}

            {/* Load More Button */}
            {hasMore && !isLoadingMore && (
              <div className="flex justify-center py-6">
                <button
                  onClick={() => loadTrends(false)}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  Load More
                </button>
              </div>
            )}

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-6">
                <div className="text-muted-foreground">Loading more...</div>
              </div>
            )}

            {/* End of feed */}
            {!hasMore && items.length > 0 && (
              <div className="text-center py-6 text-muted-foreground">
                You've reached the end! 🎉
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
