import { get, post } from './client'
import type { TrendsResponse, TrendItem, FeedbackAction, FeedFilters } from '@/types/trend'

/**
 * Fetch trends with filters
 */
export async function fetchTrends(filters: Partial<FeedFilters> & { limit?: number; cursor?: string }): Promise<TrendsResponse> {
  const params: Record<string, string | number | undefined> = {
    limit: filters.limit || 20,
  }

  // Add optional filters
  if (filters.region && filters.region !== 'all') {
    params.region = filters.region
  }

  if (filters.buckets && filters.buckets.length > 0) {
    params.bucket = filters.buckets.join(',')
  }

  if (filters.cursor) {
    params.cursor = filters.cursor
  }

  if (filters.surprise) {
    params.surprise = 1
  }

  try {
    // The crawler API endpoint
    const data = await get<TrendItem[]>('/trends', params)

    // The current API returns an array directly, not { items, next_cursor }
    // We'll adapt to this format
    return {
      items: data,
      next_cursor: null, // Pagination not yet implemented in crawler API
    }
  } catch (error) {
    console.error('Failed to fetch trends:', error)
    // Return empty result on error instead of throwing
    return {
      items: [],
      next_cursor: null,
    }
  }
}

/**
 * Fetch a single trend item by ID
 */
export async function fetchTrendItem(id: number): Promise<TrendItem | null> {
  try {
    // The crawler API doesn't have a single-item endpoint yet
    // We'll fetch all and filter client-side as a temporary solution
    const response = await get<TrendItem[]>('/trends', { limit: 500 })
    const item = response.find(item => item.id === id)
    return item || null
  } catch (error) {
    console.error(`Failed to fetch trend item ${id}:`, error)
    return null
  }
}

/**
 * Submit user feedback
 * Note: This endpoint may not exist yet on the crawler API
 * We'll stub it to log locally and fail gracefully
 */
export async function submitFeedback(feedback: FeedbackAction): Promise<boolean> {
  try {
    // Try to post to the feedback endpoint
    await post('/feedback', feedback)
    return true
  } catch (error) {
    // If endpoint doesn't exist (404), just log locally
    console.log('Feedback (API not available, logging locally):', feedback)

    // Store feedback in localStorage as a fallback
    if (typeof window !== 'undefined') {
      const feedbackLog = JSON.parse(localStorage.getItem('feedback_log') || '[]')
      feedbackLog.push({
        ...feedback,
        timestamp: new Date().toISOString(),
      })
      localStorage.setItem('feedback_log', JSON.stringify(feedbackLog))
    }

    return true
  }
}
