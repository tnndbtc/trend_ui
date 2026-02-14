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
  rank_position: number | null
  engagement_signals: Record<string, any>
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
  next_cursor?: string | null
}

export interface FeedbackAction {
  item_id: number
  action: 'like' | 'dislike' | 'save' | 'hide'
}

export type Region = 'us' | 'jp' | 'kr' | 'cn' | 'all'
export type Language = 'original' | 'en-US'
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
  region?: Region
  language: Language
  buckets: Bucket[]
  surprise: boolean
  search?: string
}
