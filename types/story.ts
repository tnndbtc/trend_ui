/**
 * TypeScript types for story_engine API responses.
 * Must match the Pydantic schemas in story_engine/src/api/schemas.py
 */

export interface SourceItem {
  url: string
  platform: string
  hotness: number
  title: string
}

export interface CommentItem {
  text: string
  likes: number
  platform: string
}

export interface Script {
  hook: string
  bullets: string[]
  twist: string
  full_text: string
}

export type FormatType = string  // 'explainer', 'top5', ..., 'format_10', ..., 'format_46'

export type StoryLang = 'en' | 'zh'
export type StoryStatus = 'generating' | 'ready' | 'failed'

export interface StoryCard {
  id: number
  title: string
  format: FormatType
  channel: number
  lang: StoryLang
  status: StoryStatus
  generated_at: string | null
  sources_count: number
}

export interface Story extends StoryCard {
  script: Script
  sources: SourceItem[]
  comments_used: CommentItem[]
}

export interface StoriesListResponse {
  date: string
  generated_at: string
  total: number
  stories: Story[]
}

export interface StorySetSummary {
  id: number
  batch_ts: string
  lang: string
  channel: number
  status: string
  story_count: number
  profile_id?: string | null  // per-run overlay id, e.g. "run2_ai"
}

export interface EngineStatus {
  scheduler: string
  last_run_at: string | null
  last_run_status: string | null
  stories_today: number
  crawler_db_path: string
  crawler_db_reachable: boolean
}
