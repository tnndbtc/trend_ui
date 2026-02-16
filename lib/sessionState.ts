import type { TrendItem } from '@/types/trend'

/**
 * Feed state structure for session persistence
 */
export interface FeedSessionState {
  items: TrendItem[]
  cursor: string | null
  scrollPosition: number
  timestamp: number
}

const SESSION_KEY = 'trend_feed_session'
const SESSION_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Save feed state to sessionStorage
 */
export function saveFeedState(state: Omit<FeedSessionState, 'timestamp'>): void {
  try {
    const stateWithTimestamp: FeedSessionState = {
      ...state,
      timestamp: Date.now(),
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateWithTimestamp))
  } catch (error) {
    console.warn('[sessionState] Failed to save feed state:', error)
  }
}

/**
 * Load feed state from sessionStorage
 * Returns null if expired or not found
 */
export function loadFeedState(): FeedSessionState | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const state: FeedSessionState = JSON.parse(stored)

    // Check if state is expired
    const age = Date.now() - state.timestamp
    if (age > SESSION_EXPIRY_MS) {
      clearFeedState()
      return null
    }

    return state
  } catch (error) {
    console.warn('[sessionState] Failed to load feed state:', error)
    return null
  }
}

/**
 * Clear feed state from sessionStorage
 */
export function clearFeedState(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch (error) {
    console.warn('[sessionState] Failed to clear feed state:', error)
  }
}

/**
 * Update only the scroll position in existing state
 */
export function updateScrollPosition(scrollPosition: number): void {
  try {
    const state = loadFeedState()
    if (state) {
      saveFeedState({
        items: state.items,
        cursor: state.cursor,
        scrollPosition,
      })
    }
  } catch (error) {
    console.warn('[sessionState] Failed to update scroll position:', error)
  }
}
