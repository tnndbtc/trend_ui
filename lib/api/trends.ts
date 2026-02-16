import { get, post } from './client'
import type { TrendsResponse, TrendItem, FeedbackAction, Region, Surface } from '@/types/trend'

/**
 * Fetch trends with cursor-based pagination (no filters)
 * Pure "For You" feed style
 */
export async function fetchTrends(options: { cursor?: string | null; limit?: number } = {}): Promise<TrendsResponse> {
  const params: Record<string, string | number | undefined> = {
    limit: options.limit || 50,
  }

  // Add cursor if present
  if (options.cursor) {
    params.cursor = options.cursor
  }

  try {
    // The crawler API now returns cursor-based envelope
    const data = await get<TrendsResponse>('/trends', params)
    return data
  } catch (error) {
    console.error('Failed to fetch trends:', error)
    // Return empty result on error instead of throwing
    return {
      items: [],
      next_cursor: null,
      has_more: false,
    }
  }
}

/**
 * Fetch a single trend item by ID
 */
export async function fetchTrendItem(id: number): Promise<TrendItem | null> {
  try {
    // The crawler API doesn't have a single-item endpoint yet
    // We'll fetch a large page and filter client-side as a temporary solution
    const response = await get<TrendsResponse>('/trends', { limit: 200 })
    const item = response.items.find(item => item.id === id)
    return item || null
  } catch (error) {
    console.error(`Failed to fetch trend item ${id}:`, error)
    return null
  }
}

/**
 * Fetch available regions
 */
export async function fetchRegions(enabledOnly = true): Promise<Region[]> {
  try {
    const params = enabledOnly ? { enabled_only: true } : {}
    const data = await get<Region[]>('/regions', params)
    return data
  } catch (error) {
    console.error('Failed to fetch regions:', error)
    return []
  }
}

/**
 * Fetch surfaces (trend sources)
 */
export async function fetchSurfaces(enabledOnly = true, region?: string): Promise<Surface[]> {
  try {
    const params: Record<string, string | number | boolean | undefined> = {
      enabled_only: enabledOnly,
    }
    if (region) {
      params.region = region
    }
    const data = await get<Surface[]>('/surfaces', params)
    return data
  } catch (error) {
    console.error('Failed to fetch surfaces:', error)
    return []
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
