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
  subscriber_count:      number | null   // Data API; authoritative unless hidden
  subscriber_count_hidden: boolean | null // true = owner hid the public count
  real_subscriber_count: number | null   // Analytics fallback; lags ~2-3 days
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
  lang:              string | null   // 'en' = KataGo, 'zh' = KataGo Chinese, 'ja' = KataGo Japanese, 'ko' = KataGo Korean playlist
  is_famous:         number | null   // 1 = famous game, 0 = ai_selfplay
  ab_variant:        string | null   // 'male-en' | 'female-en' | 'male-zh' | 'female-zh'
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

// Live subscriber vs non-subscriber view split for one KataGo language tab
// (GET /api/games/subscriber-split?lang=en|zh|ja|ko). Fetched fresh per page load.
export interface SubscriberSplitWindow {
  key:            string   // '7d' | '28d' | '90d'
  label:          string
  subscribed:     number
  non_subscribed: number
  total:          number
  pct:            number   // % of views from subscribers
}

export interface SubscriberSplitWeek {
  week_start:     string   // ISO date (Monday)
  label:          string
  subscribed:     number
  non_subscribed: number
  total:          number
  pct:            number
  partial:        boolean  // week not yet complete → drawn hollow
}

export interface GamesSubscriberSplit {
  lang:        string
  channel_id:  string | null
  through:     string | null   // last day included (72h latency)
  available:   boolean         // false → show `note` instead of charts
  note:        string | null
  video_count: number
  windows:     SubscriberSplitWindow[]
  weeks:       SubscriberSplitWeek[]
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

// ---------------------------------------------------------------------------
// Comment-questions review  (GET /api/games/comment-questions)
// ---------------------------------------------------------------------------

export interface WinrateStep {
  color:   string   // "Black" | "White"
  move:    string   // GTP coordinate, e.g. "Q8"
  winrate: number   // Black win% after this move
  score:   number   // score lead (positive = Black ahead)
}

export interface WinrateResult {
  fork_winrate: number       // Black win% at the fork (before hypothetical)
  fork_score:   number       // score lead at fork
  steps:        WinrateStep[]
}

export interface LifeDeathResult {
  status:           string   // 'alive' | 'dead' | 'unsettled'
  target_color:     string   // 'B' | 'W'
  group_anchor_gtp: string   // representative point, e.g. "S2"
  group_size:       number
  ownership_avg:    number   // avg ownership, group's-color perspective [-1,1]
  confidence:       number   // 0..1
  at_move:          number | null
  whatif_moves:     string | null
  resolved_by:      string | null   // 'anchor' | 'nearest_move' | 'region'
}

export interface CommentQuestion {
  id:           number
  comment_id:   string
  comment_text: string
  author:       string | null
  like_count:   number
  at_move:      number | null
  whatif_moves: string       // e.g. "Q8 Q9"
  visits:       number
  kind:          string                  // 'whatif' | 'life_death'
  result:        WinrateResult | null    // set when kind='whatif'
  life_death:    LifeDeathResult | null  // set when kind='life_death'
  reply_preview: string | null           // exact localized reply that will be posted
  status:        string       // 'analyzed' | 'approved' | 'skipped'
}

export interface VideoWithCommentQuestions {
  video_db_id:  number
  video_id:     string
  title:        string | null
  published_at: number | null   // UNIX timestamp
  questions:    CommentQuestion[]
}
