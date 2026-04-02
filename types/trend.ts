export interface TrendItem {
  id: number
  url: string
  platform: string
  bucket: string
  published_at: string | null
  collected_at: string
  title_original: string
  description_original: string | null
  original_locale: string
  canonical_title: string
  canonical_description: string | null
  display_title: string
  display_description: string | null
  rank_position: number | null
  engagement_signals: Record<string, any>
  thumbnail_url: string | null
  region_key: string
  translations?: {
    [locale: string]: {
      title: string
      description: string | null
      status: 'pending' | 'running' | 'complete' | 'failed'
    }
  }
}

export interface TrendsResponse {
  items: TrendItem[]
  next_cursor: string | null
  has_more: boolean
}

export interface FeedbackAction {
  item_id: number
  action: 'like' | 'dislike' | 'save' | 'hide'
}

export interface Region {
  key: string
  name: string
  default_locale: string
  enabled: boolean
}

export interface Surface {
  id: number
  region_key: string
  key: string
  platform: string
  surface_type: string
  bucket: string
  bucket_weight: number
  enabled: boolean
  poll_interval_seconds: number
  last_run_at: string | null
  last_success_at: string | null
  last_error: string | null
}

export type Language = 'en-US' | 'zh-Hans'
export type Bucket =
  | 'hot_now'
  | 'rising'
  | 'category_tech'
  | 'category_sports'
  | 'category_entertainment'
  | 'category_finance'
  | 'category_gaming'
  | 'category_lifestyle'
  | 'category_science'
  | 'category_politics'
  | 'region_local'
  | 'evergreen'

export interface FeedFilters {
  region?: string
  language: Language
  buckets: Bucket[]
  surprise: boolean
  search?: string
}
