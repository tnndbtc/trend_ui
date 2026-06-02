/**
 * API client for story_engine endpoints.
 *
 * story_engine runs on port 8003 (separate from crawler API on 8002).
 * Next.js rewrites proxy /api/stories/* to the story_engine backend.
 */

import type { Story, StoriesListResponse, StorySetSummary, StoryLang, FormatType, YoutubeAnalyticRow, YoutubeSubscriber, StoryWithComments, GamesChannelStats, GamesVideoRow, GamesCountryRow, GamesSubtitleRow, ChannelVideoRow, StrategyChange } from '@/types/story'

const STORY_API_BASE = process.env.NEXT_PUBLIC_STORY_API_BASE_URL || '/api'

async function storyFetch<T>(endpoint: string, params?: Record<string, string | undefined>): Promise<T> {
  let url = `${STORY_API_BASE}${endpoint}`

  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Story API error: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

/**
 * Fetch today's stories (full objects with scripts).
 */
export async function fetchStoriesToday(lang?: StoryLang): Promise<StoriesListResponse> {
  return storyFetch<StoriesListResponse>('/stories/today', {
    lang: lang,
  })
}

/**
 * Fetch a single story by ID (full detail).
 */
export async function fetchStory(id: number): Promise<Story> {
  return storyFetch<Story>(`/stories/${id}`)
}

/**
 * Fetch stories list with optional filters.
 */
/**
 * Fetch story sets, optionally filtered by per-run overlay profile id.
 *
 * @param profile  Optional profile filter, e.g. "run2_ai". When provided,
 *                 only returns sets generated under that channel profile.
 *                 Used by the /stories page channel tabs.
 */
export async function fetchStorySets(profile?: string, lang?: StoryLang): Promise<StorySetSummary[]> {
  return storyFetch<StorySetSummary[]>('/story-sets', { profile, lang })
}

/**
 * Fetch stories in a specific story set.
 */
export async function fetchStorySet(setId: number): Promise<StoriesListResponse> {
  return storyFetch<StoriesListResponse>(`/story-sets/${setId}`)
}

/**
 * Fetch YouTube Analytics rows for a story set.
 * Returns one row per published locale (en, zh).
 * analytics_pulled_at: null = pending, 'no_data' = gave up, ISO string = fetched.
 */
export async function fetchAnalytics(setId: number): Promise<YoutubeAnalyticRow[]> {
  return storyFetch<YoutubeAnalyticRow[]>(`/analytics/story-set/${setId}`)
}

/**
 * Fetch all public subscribers from the DB (populated by fetch_subscribers.py).
 * Only subscribers with public YouTube subscriptions are returned.
 */
export async function fetchSubscribers(): Promise<YoutubeSubscriber[]> {
  return storyFetch<YoutubeSubscriber[]>('/subscribers')
}

/**
 * Fetch all published stories that have viewer comments.
 * Populated by fetch_video_comments.py.
 */
export async function fetchVideoComments(): Promise<StoryWithComments[]> {
  return storyFetch<StoryWithComments[]>('/comments')
}

/**
 * Fetch KataGo channel-level stats (subscribers, total views, video count).
 * Populated by fetch_games_analytics.py.
 */
export async function fetchGamesChannelStats(): Promise<GamesChannelStats> {
  return storyFetch<GamesChannelStats>('/games/channel-stats')
}

/**
 * Fetch all published KataGo videos with per-video stats (views, likes, comments).
 * Populated by fetch_games_analytics.py.
 */
export async function fetchGamesVideos(): Promise<GamesVideoRow[]> {
  return storyFetch<GamesVideoRow[]>('/games/videos')
}

/**
 * Fetch lifetime viewer counts by country for the KataGo channel, sorted by views DESC.
 * Populated by fetch_games_analytics.py (requires yt-analytics.readonly scope).
 */
export async function fetchGamesAudienceCountries(): Promise<GamesCountryRow[]> {
  return storyFetch<GamesCountryRow[]>('/games/audience-countries')
}

export async function fetchGamesSubtitleLangs(): Promise<GamesSubtitleRow[]> {
  return storyFetch<GamesSubtitleRow[]>('/games/subtitle-langs')
}

/**
 * Fetch all published deep-story videos for the EN or ZH channel,
 * newest first, with analytics data and story title.
 */
export async function fetchChannelVideos(lang: 'en' | 'zh'): Promise<ChannelVideoRow[]> {
  return storyFetch<ChannelVideoRow[]>(`/analytics/channel?lang=${lang}`)
}

export async function fetchStrategyChanges(): Promise<StrategyChange[]> {
  return storyFetch<StrategyChange[]>('/analytics/strategy-changes')
}

/**
 * Trigger a background refresh of YouTube Analytics for all eligible
 * deep-story videos (EN + ZH). Returns immediately; poll fetchChannelVideos
 * after ~20s to get updated data.
 */
export async function refreshChannelAnalytics(): Promise<{ status: string }> {
  const response = await fetch(`${STORY_API_BASE}/analytics/refresh`, { method: 'POST' })
  if (!response.ok) throw new Error(`Analytics refresh error: ${response.status}`)
  return response.json()
}

export async function fetchStories(opts?: {
  date?: string
  format?: FormatType
  lang?: StoryLang
  limit?: number
}): Promise<Story[]> {
  return storyFetch<Story[]>('/stories', {
    date: opts?.date,
    format: opts?.format,
    lang: opts?.lang,
    limit: opts?.limit?.toString(),
  })
}
