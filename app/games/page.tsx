'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchGamesChannelStats, fetchGamesVideos, fetchGamesAudienceCountries, fetchGamesSubtitleLangs } from '@/lib/api/stories'
import type { GamesChannelStats, GamesVideoRow, GamesComment, GamesCountryRow, GamesSubtitleRow } from '@/types/story'

type GamesLang = 'en' | 'zh'

const PLAYLIST_LABELS: Record<GamesLang, { label: string; playlist: string }> = {
  en: { label: 'KataGo',     playlist: 'PL5Xv3qmUSUqUrG-NTMe2IjNP_aHcI2m-w' },
  zh: { label: 'Go Chinese', playlist: 'PL5Xv3qmUSUqWDllUJi9BEP_3basoWCHv0' },
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

/** Format seconds as "1m 23s" or "45s" */
function fmtDuration(secs: number | null | undefined): string {
  if (secs === null || secs === undefined) return '—'
  const s = Math.round(secs)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Convert ISO 3166-1 alpha-2 code to flag emoji (e.g. "TW" → "🇹🇼"). */
function countryFlag(code: string): string {
  // Regional indicator offset: 'A'=0x41, 🇦=0x1F1E6, delta=0x1F1A5
  return code.toUpperCase().replace(/[A-Z]/g, c =>
    String.fromCodePoint(c.charCodeAt(0) + 0x1F1A5)
  )
}

/** Human-readable country name (best-effort via Intl.DisplayNames, fallback to code). */
function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function AudienceMap({ rows }: { rows: GamesCountryRow[] }) {
  if (rows.length === 0) return null
  const totalViews = rows.reduce((s, r) => s + r.views, 0)
  const display    = rows.slice(0, 15)   // top-15 countries
  return (
    <div className="rounded-xl border bg-card p-4 mb-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Viewer Countries · lifetime
      </p>
      <div className="space-y-1.5">
        {display.map(r => {
          const pct = totalViews > 0 ? (r.views / totalViews) * 100 : 0
          return (
            <div key={r.country} className="flex items-center gap-2 text-sm">
              <span className="text-base leading-none w-6 text-center">{countryFlag(r.country)}</span>
              <span className="w-24 text-muted-foreground truncate" title={countryName(r.country)}>
                {countryName(r.country)}
              </span>
              {/* bar */}
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
              <span className="w-10 text-right tabular-nums text-muted-foreground text-xs">
                {pct.toFixed(1)}%
              </span>
              <span className="w-12 text-right tabular-nums text-xs">
                {fmt(r.views)}
              </span>
            </div>
          )
        })}
      </div>
      {rows.length > 15 && (
        <p className="text-xs text-muted-foreground mt-2">
          +{rows.length - 15} more countries
        </p>
      )}
    </div>
  )
}

function SubtitleLangChart({ rows }: { rows: GamesSubtitleRow[] }) {
  const total = rows.reduce((s, r) => s + r.views, 0)
  return (
    <div className="rounded-xl border bg-card p-4 mb-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        CC / Subtitle Language · lifetime
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">N/A — YouTube Analytics API does not expose CC language usage</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => {
            const label = r.lang === '' ? '(subtitles off)' : r.lang
            const pct   = total > 0 ? (r.views / total) * 100 : 0
            return (
              <div key={r.lang} className="flex items-center gap-2 text-sm">
                <span className="w-28 text-muted-foreground truncate font-mono text-xs" title={label}>
                  {label}
                </span>
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-muted-foreground text-xs">
                  {pct.toFixed(1)}%
                </span>
                <span className="w-12 text-right tabular-nums text-xs">
                  {fmt(r.views)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function CommentThread({ comments }: { comments: GamesComment[] }) {
  if (comments.length === 0) return null
  return (
    <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {comments.length} comment{comments.length !== 1 ? 's' : ''}
      </p>
      {comments.map(c => {
        const authorUrl = c.author_channel_id
          ? `https://www.youtube.com/channel/${c.author_channel_id}`
          : undefined
        return (
          <div key={c.comment_id} className="flex gap-3">
            {/* avatar */}
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0 select-none">
              {c.author_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                {authorUrl ? (
                  <a href={authorUrl} target="_blank" rel="noopener noreferrer"
                     className="text-xs font-semibold hover:underline">
                    {c.author_name ?? 'Anonymous'}
                  </a>
                ) : (
                  <span className="text-xs font-semibold">{c.author_name ?? 'Anonymous'}</span>
                )}
                {c.published_at && (
                  <span className="text-xs text-muted-foreground">{fmtDate(c.published_at)}</span>
                )}
                {c.like_count > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">👍 {c.like_count}</span>
                )}
              </div>
              <p className="text-sm mt-0.5 leading-relaxed">{c.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VideoCard({ video }: { video: GamesVideoRow }) {
  const [expanded, setExpanded] = useState(false)
  const ytUrl = `https://www.youtube.com/watch?v=${video.video_id}`
  const hasComments = (video.comments?.length ?? 0) > 0

  // Auto-expand if there are comments
  useEffect(() => {
    if (hasComments) setExpanded(true)
  }, [hasComments])

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* ── main row ── */}
      <div className="px-4 py-3 flex items-start gap-3">

        {/* thumbnail */}
        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
           className="flex-shrink-0 w-32 h-[72px] rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity">
          <img
            src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`}
            alt={video.title ?? video.video_id}
            className="w-full h-full object-cover"
          />
        </a>

        {/* title + meta */}
        <div className="flex-1 min-w-0">
          <a href={ytUrl} target="_blank" rel="noopener noreferrer"
             className="text-sm font-semibold hover:underline leading-snug line-clamp-2 block mb-1.5">
            {video.title ?? video.video_id}
          </a>

          {/* stat pills row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="text-foreground/60">{fmtTime(video.published_at)}</span>

            <span title="Views">
              👁 <span className="font-medium text-foreground">{fmt(video.views)}</span>
            </span>

            {/* avg watch duration */}
            <span title="Average watch time">
              ⏱ <span className={`font-medium ${
                video.avg_view_duration != null ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {fmtDuration(video.avg_view_duration)}
              </span>
            </span>

            {/* retention % */}
            <span title="Average view percentage (retention)">
              📊 <span className={`font-medium ${
                video.avg_view_pct == null          ? 'text-muted-foreground' :
                video.avg_view_pct >= 30            ? 'text-green-600 dark:text-green-400' :
                video.avg_view_pct >= 15            ? 'text-foreground' :
                                                      'text-orange-500'
              }`}>
                {video.avg_view_pct != null ? `${video.avg_view_pct.toFixed(1)}%` : '—'}
              </span>
            </span>

            {/* likes — count only; individual likers not available via YouTube API */}
            {(video.likes ?? 0) > 0 && (
              <span title="Likes (YouTube does not expose who liked)">
                👍 <span className="font-medium text-foreground">{fmt(video.likes)}</span>
              </span>
            )}

            {/* comments toggle */}
            {hasComments && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                💬 <span className="font-medium text-foreground">{video.comments.length}</span>
                <span className="ml-0.5">{expanded ? '▲' : '▼'}</span>
              </button>
            )}
            {!hasComments && (video.comment_count ?? 0) === 0 && (
              <span className="text-muted-foreground/60">💬 no comments</span>
            )}
          </div>
        </div>
      </div>

      {/* ── comment thread (collapsible) ── */}
      {expanded && hasComments && <CommentThread comments={video.comments} />}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const [channel, setChannel]       = useState<GamesChannelStats | null>(null)
  const [videos, setVideos]         = useState<GamesVideoRow[]>([])
  const [countries, setCountries]   = useState<GamesCountryRow[]>([])
  const [subtitles, setSubtitles]   = useState<GamesSubtitleRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeLang, setActiveLang] = useState<GamesLang>('en')

  function load() {
    return Promise.all([
      fetchGamesChannelStats(),
      fetchGamesVideos(),
      fetchGamesAudienceCountries(),
      fetchGamesSubtitleLangs(),
    ])
      .then(([ch, vids, ctrs, subs]) => {
        setChannel(ch); setVideos(vids); setCountries(ctrs); setSubtitles(subs)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch('/api/games/refresh', { method: 'POST' })
      await new Promise(r => setTimeout(r, 15_000))
      setLoading(true)
      setError(null)
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  // Filter videos by active playlist tab. Treat null lang (pre-migration rows) as 'en'.
  const filteredVideos = useMemo(
    () => videos.filter(v => (v.lang ?? 'en') === activeLang),
    [videos, activeLang],
  )

  const totalViews    = filteredVideos.reduce((s, v) => s + (v.views    ?? 0), 0)
  const totalComments = filteredVideos.reduce((s, v) => s + (v.comments?.length ?? 0), 0)
  const totalLikes    = filteredVideos.reduce((s, v) => s + (v.likes    ?? 0), 0)
  const videosWithRetention = filteredVideos.filter(v => v.avg_view_pct != null)
  const avgRetention = videosWithRetention.length > 0
    ? videosWithRetention.reduce((s, v) => s + (v.avg_view_pct ?? 0), 0) / videosWithRetention.length
    : null

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">

      {/* ── header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>♟</span> KataGo Channel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            <a
              href={`https://www.youtube.com/channel/${channel?.channel_id ?? 'UCLeNQ9jLgctQzOhjYseIlFQ'}`}
              target="_blank" rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              {channel?.channel_name ?? 'analysis-game'}
            </a>
            {channel?.fetched_at && (
              <span className="ml-2 text-muted-foreground">
                · refreshed {fmtDate(channel.fetched_at)}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 hover:bg-muted"
        >
          {refreshing ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Refreshing…
            </>
          ) : '↻ Refresh'}
        </button>
      </div>

      {/* ── KataGo / Go Chinese playlist tabs ── */}
      <div className="flex gap-1 mb-6 border-b">
        {(['en', 'zh'] as GamesLang[]).map(lang => {
          const pl    = PLAYLIST_LABELS[lang]
          const count = videos.filter(v => (v.lang ?? 'en') === lang).length
          return (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeLang === lang
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {pl.label}
              {!loading && count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
              )}
            </button>
          )
        })}
        <a
          href={`https://www.youtube.com/playlist?list=${PLAYLIST_LABELS[activeLang].playlist}`}
          target="_blank" rel="noopener noreferrer"
          className="ml-auto self-center text-xs text-muted-foreground hover:text-foreground transition-colors pb-2"
        >
          ↗ playlist
        </a>
      </div>

      {/* ── loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>
      )}

      {/* ── error ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      {!loading && (
        <>
          {/* ── stat cards (per active playlist) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Subscribers"
              value={
                channel?.real_subscriber_count != null
                  ? fmt(channel.real_subscriber_count)
                  : channel?.subscriber_count
                    ? fmt(channel.subscriber_count)
                    : '—'
              }
              sub="channel total"
            />
            <StatCard
              label="Videos"
              value={fmt(filteredVideos.length)}
              sub={`${PLAYLIST_LABELS[activeLang].label} playlist`}
            />
            <StatCard
              label="Total views"
              value={fmt(totalViews)}
            />
            <StatCard
              label="Avg retention"
              value={avgRetention != null ? `${avgRetention.toFixed(1)}%` : '—'}
              sub={videosWithRetention.length > 0
                ? `${videosWithRetention.length} of ${filteredVideos.length} videos`
                : 'Enable Analytics API'}
            />
          </div>

          {/* ── viewer country breakdown ── */}
          {countries.length > 0 && <AudienceMap rows={countries} />}

          {/* ── CC / subtitle language breakdown ── */}
          <SubtitleLangChart rows={subtitles} />

          {/* ── notices ── */}
          <div className="space-y-2 mb-6">
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 px-4 py-2.5 text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">⏱ Watch time & retention</span>
              {' '}appear after each video is 72h old (YouTube Analytics API latency).
              {videosWithRetention.length === 0 && (
                <span className="ml-1">
                  Make sure the{' '}
                  <a
                    href="https://console.developers.google.com/apis/api/youtubeanalytics.googleapis.com/overview?project=933602205414"
                    target="_blank" rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    YouTube Analytics API is enabled
                  </a>.
                </span>
              )}
            </div>
            <div className="rounded-lg border border-muted px-4 py-2.5 text-xs text-muted-foreground">
              👍 <span className="font-medium">Likes: {fmt(totalLikes)} total</span>
              {' '}· YouTube removed the API for seeing <em>who</em> liked a video in 2021 — only the count is available.
              {' '}💬 <span className="font-medium">{totalComments} comment{totalComments !== 1 ? 's' : ''}</span>
              {' '}fetched so far.
            </div>
          </div>

          {/* ── video cards (filtered by active playlist tab) ── */}
          {filteredVideos.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <p className="text-4xl mb-3">🎬</p>
              <p className="font-medium">
                {videos.length === 0 ? 'No video data yet' : `No ${PLAYLIST_LABELS[activeLang].label} videos yet`}
              </p>
              {videos.length === 0 && (
                <p className="text-sm mt-1">
                  Click <strong>↻ Refresh</strong> to fetch from YouTube.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredVideos.map(v => (
                <VideoCard key={v.video_id} video={v} />
              ))}
            </div>
          )}

          {/* ── token info ── */}
          <div className="mt-8 rounded-xl border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              Analytics via <code className="font-mono bg-muted px-1 py-0.5 rounded">token_chess.json</code>
              {' '}(same channel — <code className="font-mono bg-muted px-1 py-0.5 rounded">UCLeNQ9jLgctQzOhjYseIlFQ</code>).
              Scopes: <code className="font-mono bg-muted px-1 py-0.5 rounded">youtube</code>{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">youtube.force-ssl</code>{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">yt-analytics.readonly</code>.
              <code className="font-mono bg-muted px-1 py-0.5 rounded ml-1">token_games.json</code> and{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">token_katago2.json</code> are upload-only — no changes needed.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
