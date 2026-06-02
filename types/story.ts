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
  token_estimate?: number | null  // chars/4 proxy; only set for deep_story format
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

export interface YoutubeAnalyticRow {
  video_id:            string
  lang:                string           // 'en' | 'zh'
  locale:              string           // 'en-US' | 'zh-Hans'
  views:               number | null
  avg_view_duration:   number | null    // seconds
  avg_view_pct:        number | null    // %
  ctr_pct:             number | null    // % — null until channel is monetized
  published_at:        string | null    // ISO datetime
  analytics_pulled_at: string | null    // ISO datetime | 'no_data' | null (pending)
}

export interface YoutubeSubscriberPlaylist {
  id:         string
  title:      string
  item_count: number
  created_at: string | null
}

export interface YoutubeSubscribedChannel {
  profile:       string          // e.g. "en" | "zh"
  channel_id:    string          // our YouTube channel ID
  channel_name:  string          // our channel's display name
  subscribed_at: string | null   // ISO datetime when they subscribed
}

export interface YoutubeSubscriber {
  channel_id:       string
  display_name:     string
  description:      string | null
  country:          string | null
  account_created:  string | null
  subscriber_count: number | null
  video_count:      number | null
  view_count:       number | null
  subscribed_to:    YoutubeSubscribedChannel[]
  public_playlists: YoutubeSubscriberPlaylist[]
  fetched_at:       string | null
}

export interface VideoComment {
  comment_id:        string
  author_name:       string | null
  author_channel_id: string | null
  text:              string
  like_count:        number
  published_at:      string | null
}

export interface StoryWithComments {
  video_id:       string
  lang:           string
  upload_profile: string
  story_set_id:   number | null
  story_title:    string | null
  published_at:   string | null
  comments:       VideoComment[]
}

export interface EngineStatus {
  scheduler: string
  last_run_at: string | null
  last_run_status: string | null
  stories_today: number
  crawler_db_path: string
  crawler_db_reachable: boolean
}

// ── Games / KataGo channel analytics ─────────────────────────────────────────

export interface GamesChannelStats {
  channel_id:            string
  channel_name:          string | null
  subscriber_count:      number | null   // 0 when hidden by YouTube (<1K)
  real_subscriber_count: number | null   // exact count via Analytics API
  video_count:           number | null
  view_count:            number | null
  fetched_at:            string | null
}

export interface GamesComment {
  comment_id:        string
  author_name:       string | null
  author_channel_id: string | null
  text:              string
  like_count:        number
  published_at:      string | null
}

export interface GamesVideoRow {
  video_id:          string
  title:             string | null
  published_at:      string | null
  views:             number | null
  likes:             number | null
  comment_count:     number | null
  avg_view_duration: number | null   // seconds
  avg_view_pct:      number | null   // %
  fetched_at:        string | null
  comments:          GamesComment[]
}

export interface GamesCountryRow {
  country:    string   // ISO 3166-1 alpha-2
  views:      number
  fetched_at: string | null
}

export interface GamesSubtitleRow {
  lang:       string   // e.g. "zh-Hans", "en", "" = subtitles off
  views:      number
  fetched_at: string | null
}

// ---------------------------------------------------------------------------
// Story-engine channel analytics  (GET /api/analytics/channel?lang=en|zh)
// ---------------------------------------------------------------------------

export interface ChannelVideoRow {
  video_id:            string
  lang:                string            // 'en' | 'zh'
  story_set_id:        number | null
  title:               string | null     // from hierarchical_stories deep_story $.title
  profile_id:          string | null     // run2_ai | run3_world | …
  published_at:        string | null     // ISO datetime
  views:               number | null
  avg_view_duration:   number | null     // seconds
  avg_view_pct:        number | null     // %
  like_count:          number | null
  comment_count:       number | null
  analytics_pulled_at: string | null     // null=pending, 'no_data'=gave up, ISO=fetched
}

export interface StrategyChange {
  date:  string   // "YYYY-MM-DD"
  label: string   // e.g. "策略B（新选题策略）"
}
