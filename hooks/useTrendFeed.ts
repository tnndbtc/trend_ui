import { useState, useCallback, useRef, useEffect } from 'react'
import type { TrendItem, Language } from '@/types/trend'
import { fetchTrends } from '@/lib/api/trends'

interface UseTrendFeedOptions {
  dismissedItems?: Set<string>
  hiddenPlatforms?: Set<string>
  language?: Language
}

interface UseTrendFeedReturn {
  items: TrendItem[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  fetchNext: (reset?: boolean) => Promise<void>
  retry: () => Promise<void>
}

/**
 * Pure "For You" feed hook with no filters
 * Client-side filtering for dismissed items and hidden platforms
 */
export function useTrendFeed({
  dismissedItems = new Set(),
  hiddenPlatforms = new Set(),
  language
}: UseTrendFeedOptions = {}): UseTrendFeedReturn {
  const [allItems, setAllItems] = useState<TrendItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  // Track seen IDs to prevent duplicates
  const seenIdsRef = useRef<Set<number>>(new Set())

  // Filter items based on dismissed/hidden
  const items = allItems.filter(item => {
    const itemId = item.id.toString()
    if (dismissedItems.has(itemId)) return false
    if (hiddenPlatforms.has(item.platform)) return false
    return true
  })

  // Debug log
  useEffect(() => {
    console.log('[useTrendFeed] State update:', {
      allItemsCount: allItems.length,
      filteredItemsCount: items.length,
      dismissedCount: dismissedItems.size,
      hiddenPlatformsCount: hiddenPlatforms.size,
      loading,
      error
    })
  }, [allItems, items, dismissedItems, hiddenPlatforms, loading, error])

  const fetchNext = useCallback(async (reset = false) => {
    console.log('[useTrendFeed] fetchNext called with reset:', reset, { hasMore, loadingMore, loading })
    if (!reset && (!hasMore || loadingMore || loading)) {
      console.log('[useTrendFeed] Early return - conditions not met')
      return
    }

    if (reset) {
      setLoading(true)
      setAllItems([])
      setError(null)
      setNextCursor(null)
      setHasMore(true)
      seenIdsRef.current.clear()
    } else {
      setLoadingMore(true)
      setError(null)
    }

    try {
      console.log('[useTrendFeed] Fetching trends with cursor:', reset ? 'none (reset)' : nextCursor, 'language:', language)
      const response = await fetchTrends({
        cursor: reset ? undefined : nextCursor,
        limit: 50,
        lang: language,
      })

      console.log('[useTrendFeed] Received response:', {
        itemCount: response.items.length,
        hasMore: response.has_more,
        nextCursor: response.next_cursor
      })

      // Deduplicate by item ID
      const newItems = response.items.filter(item => !seenIdsRef.current.has(item.id))

      console.log('[useTrendFeed] After deduplication:', {
        newItemsCount: newItems.length,
        seenIdsCount: seenIdsRef.current.size
      })

      // Add new IDs to seen set
      newItems.forEach(item => seenIdsRef.current.add(item.id))

      if (reset) {
        setAllItems(newItems)
      } else {
        setAllItems(prev => [...prev, ...newItems])
      }

      setNextCursor(response.next_cursor || null)
      setHasMore(response.has_more ?? false)
    } catch (err) {
      console.error('[useTrendFeed] Failed to load trends:', err)
      setError('Failed to load trends. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, loading, nextCursor, language])

  const retry = useCallback(async () => {
    if (error && hasMore) {
      await fetchNext(false)
    }
  }, [error, hasMore, fetchNext])

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    fetchNext,
    retry,
  }
}
