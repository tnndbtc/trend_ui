import { useEffect, useRef } from 'react'
import type { TrendItem } from '@/types/trend'
import { loadFeedState, saveFeedState, updateScrollPosition, clearFeedState } from '@/lib/sessionState'

interface UseScrollRestorationOptions {
  items: TrendItem[]
  cursor: string | null
  shouldRestore: boolean
}

interface UseScrollRestorationReturn {
  shouldRestoreItems: boolean
  restoredItems: TrendItem[] | null
  restoredCursor: string | null
  clearSession: () => void
}

/**
 * Hook for managing scroll position restoration and feed session continuity
 */
export function useScrollRestoration({
  items,
  cursor,
  shouldRestore,
}: UseScrollRestorationOptions): UseScrollRestorationReturn {
  const restorationAttempted = useRef(false)
  const lastSaveTime = useRef(0)
  const scrollSaveTimeout = useRef<NodeJS.Timeout>()

  // Load session state on mount (only once)
  const sessionState = useRef(shouldRestore && !restorationAttempted.current ? loadFeedState() : null)

  useEffect(() => {
    if (shouldRestore && !restorationAttempted.current && sessionState.current) {
      // Restore scroll position after a short delay to allow DOM to render
      const timer = setTimeout(() => {
        if (sessionState.current?.scrollPosition) {
          window.scrollTo(0, sessionState.current.scrollPosition)
          console.log('[useScrollRestoration] Restored scroll to:', sessionState.current.scrollPosition)
        }
      }, 100)

      restorationAttempted.current = true
      return () => clearTimeout(timer)
    }
  }, [shouldRestore])

  // Save scroll position periodically (debounced)
  useEffect(() => {
    if (!shouldRestore) return

    const handleScroll = () => {
      if (scrollSaveTimeout.current) {
        clearTimeout(scrollSaveTimeout.current)
      }

      scrollSaveTimeout.current = setTimeout(() => {
        const now = Date.now()
        // Only save at most once per second to reduce overhead
        if (now - lastSaveTime.current > 1000) {
          updateScrollPosition(window.scrollY)
          lastSaveTime.current = now
        }
      }, 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollSaveTimeout.current) {
        clearTimeout(scrollSaveTimeout.current)
      }
    }
  }, [shouldRestore])

  // Save feed state when items or cursor changes
  useEffect(() => {
    if (!shouldRestore || items.length === 0) return

    // Debounce saves to avoid excessive writes
    const saveTimer = setTimeout(() => {
      saveFeedState({
        items,
        cursor,
        scrollPosition: window.scrollY,
      })
      console.log('[useScrollRestoration] Saved feed state:', { itemCount: items.length, cursor })
    }, 500)

    return () => clearTimeout(saveTimer)
  }, [items, cursor, shouldRestore])

  const clearSession = () => {
    clearFeedState()
    sessionState.current = null
    restorationAttempted.current = true
  }

  return {
    shouldRestoreItems: !restorationAttempted.current && !!sessionState.current,
    restoredItems: sessionState.current?.items || null,
    restoredCursor: sessionState.current?.cursor || null,
    clearSession,
  }
}
