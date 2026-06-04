'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchGamesChannelStats, fetchGamesVideos, fetchGamesAudienceCountries, fetchGamesSubtitleLangs, fetchGamesStrategyChanges } from '@/lib/api/stories'
import type { GamesChannelStats, GamesVideoRow, GamesComment, GamesCountryRow, GamesSubtitleRow, StrategyChange } from '@/types/story'

type GamesTab = 'en' | 'zh' | 'famous-en' | 'famous-zh'

const TAB_META: Record<GamesTab, { label: string; playlist?: string; emoji: string }> = {
  'en':        { label: 'KataGo',        emoji: '♟',  playlist: 'PL5Xv3qmUSUqUrG-NTMe2IjNP_aHcI2m-w' },
  'zh':        { label: 'Go Chinese',    emoji: '围棋', playlist: 'PL5Xv3qmUSUqWDllUJi9BEP_3basoWCHv0' },
  'famous-en': { label: 'Famous EN',     emoji: '🏆' },
  'famous-zh': { label: 'Famous ZH',     emoji: '🏆' },
}

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

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

function countryFlag(code: string): string {
  return code.toUpperCase().replace(/[A-Z]/g, c =>
    String.fromCodePoint(c.charCodeAt(0) + 0x1F1A5)
  )
}

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
  const display    = rows.slice(0, 15)
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

  useEffect(() => {
    if (hasComments) setExpanded(true)
  }, [hasComments])

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
           className="flex-shrink-0 w-32 h-[72px] rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity">
          <img
            src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`}
            alt={video.title ?? video.video_id}
            className="w-full h-full object-cover"
          />
        </a>

        <div className="flex-1 min-w-0">
          <a href={ytUrl} target="_blank" rel="noopener noreferrer"
             className="text-sm font-semibold hover:underline leading-snug line-clamp-2 block mb-1.5">
            {video.title ?? video.video_id}
          </a>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="text-foreground/60">{fmtTime(video.published_at)}</span>

            <span title="Views">
              👁 <span className="font-medium text-foreground">{fmt(video.views)}</span>
            </span>

            <span title="Average watch time">
              ⏱ <span className={`font-medium ${
                video.avg_view_duration != null ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {fmtDuration(video.avg_view_duration)}
              </span>
            </span>

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

            {(video.likes ?? 0) > 0 && (
              <span title="Likes">
                👍 <span className="font-medium text-foreground">{fmt(video.likes)}</span>
              </span>
            )}

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

      {expanded && hasComments && <CommentThread comments={video.comments} />}
    </div>
  )
}

// ── Famous tab: side-by-side male / female columns ────────────────────────────

function FamousSideBySide({
  videos,
  lang,
}: {
  videos: GamesVideoRow[]
  lang: 'famous-en' | 'famous-zh'
}) {
  const isZh = lang === 'famous-zh'

  // Split by ab_variant; videos with null ab_variant go to a separate "unpaired" list
  const maleVideos    = videos.filter(v => v.ab_variant?.startsWith('male'))
  const femaleVideos  = videos.filter(v => v.ab_variant?.startsWith('female'))
  const unpairedVideos = videos.filter(v => !v.ab_variant)

  const hasPaired = maleVideos.length > 0 || femaleVideos.length > 0

  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        <p className="text-4xl mb-3">🏆</p>
        <p className="font-medium">No {isZh ? 'Chinese' : 'English'} famous games yet</p>
        <p className="text-sm mt-1">Run the famous game pipeline to populate this tab.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasPaired && (
        <>
          {/* Column header */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 flex items-center gap-1.5">
              🎙 {isZh ? '男声 (Male)' : 'Male Voice'}
              <span className="text-muted-foreground/60">· {maleVideos.length}</span>
            </div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 flex items-center gap-1.5">
              🎙 {isZh ? '女声 (Female)' : 'Female Voice'}
              <span className="text-muted-foreground/60">· {femaleVideos.length}</span>
            </div>
          </div>

          {/* Paired rows — zip by index (both columns sorted newest-first) */}
          {Array.from({ length: Math.max(maleVideos.length, femaleVideos.length) }).map((_, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 items-start">
              <div>
                {maleVideos[i]
                  ? <VideoCard video={maleVideos[i]} />
                  : <div className="rounded-xl border border-dashed h-[90px] flex items-center justify-center text-xs text-muted-foreground">—</div>
                }
              </div>
              <div>
                {femaleVideos[i]
                  ? <VideoCard video={femaleVideos[i]} />
                  : <div className="rounded-xl border border-dashed h-[90px] flex items-center justify-center text-xs text-muted-foreground">—</div>
                }
              </div>
            </div>
          ))}
        </>
      )}

      {/* Unpaired videos (ab_variant = null) — show normally */}
      {unpairedVideos.length > 0 && (
        <>
          {hasPaired && (
            <p className="text-xs text-muted-foreground border-t pt-4">
              ℹ️ {unpairedVideos.length} video{unpairedVideos.length !== 1 ? 's' : ''} without voice variant data
            </p>
          )}
          <div className="flex flex-col gap-3">
            {unpairedVideos.map(v => <VideoCard key={v.video_id} video={v} />)}
          </div>
        </>
      )}
    </div>
  )
}

// ── strategy-period weekly grouping ──────────────────────────────────────────

/** ISO week key "YYYY-Www" (Monday-anchored, ISO 8601) */
function isoWeek(iso: string): string {
  const d = new Date(iso)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const year = d.getUTCFullYear()
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function weekDateRange(weekKey: string): string {
  const [year, wStr] = weekKey.split('-W')
  const week = parseInt(wStr, 10)
  const jan4 = new Date(Date.UTC(parseInt(year), 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monday = new Date(jan4.getTime() + (1 - jan4Day + (week - 1) * 7) * 86400000)
  const sunday = new Date(monday.getTime() + 6 * 86400000)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  return `${monday.toLocaleDateString(undefined, opts)} – ${sunday.toLocaleDateString(undefined, opts)}`
}

function strategyForDate(dateStr: string, strategies: StrategyChange[]): StrategyChange | null {
  if (!strategies.length) return null
  const date = dateStr.slice(0, 10)
  for (const s of strategies) {
    if (s.date <= date) return s
  }
  return strategies[strategies.length - 1]
}

function retentionColor(pct: number | null | undefined): string {
  if (pct == null) return 'text-muted-foreground'
  if (pct >= 30)   return 'text-green-600 dark:text-green-400'
  if (pct >= 15)   return 'text-foreground'
  return 'text-orange-500'
}

function DeltaBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null
  const delta = current - previous
  if (Math.abs(delta) < 0.5) return <span className="text-xs text-muted-foreground ml-1">→</span>
  const up = delta > 0
  return (
    <span className={`text-xs font-medium ml-1 ${up ? 'text-green-600 dark:text-green-400' : 'text-orange-500'}`}>
      {up ? '▲' : '▼'}{Math.abs(delta).toFixed(1)}%
    </span>
  )
}

interface GamesWeekGroup {
  weekKey:      string
  dateRange:    string
  strategy:     StrategyChange | null
  videos:       GamesVideoRow[]
  overallRet:   number | null
  totalViews:   number
  pendingCount: number
}

function buildGamesWeekGroups(videos: GamesVideoRow[], strategies: StrategyChange[]): GamesWeekGroup[] {
  const map = new Map<string, GamesVideoRow[]>()
  for (const v of videos) {
    if (!v.published_at) continue
    const key = isoWeek(v.published_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(v)
  }

  const groups: GamesWeekGroup[] = Array.from(map.entries()).map(([weekKey, wVideos]) => {
    wVideos.sort((a: GamesVideoRow, b: GamesVideoRow) =>
      (b.published_at ?? '').localeCompare(a.published_at ?? ''))
    const retVids    = wVideos.filter((v: GamesVideoRow) => v.avg_view_pct != null)
    const overallRet = retVids.length > 0
      ? retVids.reduce((s: number, v: GamesVideoRow) => s + (v.avg_view_pct ?? 0), 0) / retVids.length
      : null
    const firstDate  = wVideos[0]?.published_at ?? ''
    return {
      weekKey,
      dateRange:    weekDateRange(weekKey),
      strategy:     strategyForDate(firstDate, strategies),
      videos:       wVideos,
      overallRet,
      totalViews:   wVideos.reduce((s: number, v: GamesVideoRow) => s + (v.views ?? 0), 0),
      pendingCount: wVideos.filter((v: GamesVideoRow) => v.fetched_at === null && v.avg_view_pct === null).length,
    }
  })
  groups.sort((a, b) => b.weekKey.localeCompare(a.weekKey))
  return groups
}

function GamesWeekBlock({
  group,
  previousGroup,
}: {
  group:         GamesWeekGroup
  previousGroup: GamesWeekGroup | undefined
}) {
  const [expanded, setExpanded] = useState(false)
  const allPending = group.pendingCount === group.videos.length
  const prevRet    = previousGroup?.overallRet ?? null

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* header */}
      <div className="px-4 py-3 bg-muted/30 border-b flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{group.weekKey}</span>
            <span className="text-xs text-muted-foreground">{group.dateRange}</span>
            {group.strategy && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                {group.strategy.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm flex-wrap">
            <span className="text-muted-foreground">
              {group.videos.length} videos
              {group.pendingCount > 0 && (
                <span className="ml-1 text-muted-foreground/60">· {group.pendingCount} pending</span>
              )}
            </span>
            {!allPending && (
              <>
                <span>👁 <span className="font-medium">{fmt(group.totalViews)}</span></span>
                <span>
                  📊{' '}
                  {group.overallRet != null ? (
                    <>
                      <span className={`font-bold ${retentionColor(group.overallRet)}`}>
                        {group.overallRet.toFixed(1)}%
                      </span>
                      <DeltaBadge current={group.overallRet} previous={prevRet} />
                    </>
                  ) : '—'}
                  {' '}<span className="text-xs text-muted-foreground">avg retention</span>
                </span>
              </>
            )}
            {allPending && (
              <span className="text-xs text-muted-foreground/60">⏳ analytics not ready (72h wait)</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      {expanded && (
        <div className="px-4 py-3 flex flex-col gap-2">
          {group.videos.map(v => <VideoCard key={v.video_id} video={v} />)}
        </div>
      )}
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
  const [activeTab, setActiveTab]   = useState<GamesTab>('en')
  const [strategies, setStrategies] = useState<StrategyChange[]>([])

  function load() {
    fetchGamesStrategyChanges().then(setStrategies).catch(() => {})
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

  // ── filtered video sets ────────────────────────────────────────────────────

  const selfplayEn  = useMemo(() => videos.filter(v => (v.lang ?? 'en') === 'en' && !v.is_famous), [videos])
  const selfplayZh  = useMemo(() => videos.filter(v => v.lang === 'zh' && !v.is_famous), [videos])
  const famousEn    = useMemo(() => videos.filter(v => v.is_famous && (v.lang ?? 'en') === 'en'), [videos])
  const famousZh    = useMemo(() => videos.filter(v => v.is_famous && v.lang === 'zh'), [videos])

  const tabVideos: Record<GamesTab, GamesVideoRow[]> = {
    'en':        selfplayEn,
    'zh':        selfplayZh,
    'famous-en': famousEn,
    'famous-zh': famousZh,
  }

  const filteredVideos = tabVideos[activeTab]

  // Stat cards (only shown for selfplay tabs)
  const totalViews    = filteredVideos.reduce((s, v) => s + (v.views    ?? 0), 0)
  const totalComments = filteredVideos.reduce((s, v) => s + (v.comments?.length ?? 0), 0)
  const totalLikes    = filteredVideos.reduce((s, v) => s + (v.likes    ?? 0), 0)
  const videosWithRetention = filteredVideos.filter(v => v.avg_view_pct != null)
  const avgRetention = videosWithRetention.length > 0
    ? videosWithRetention.reduce((s, v) => s + (v.avg_view_pct ?? 0), 0) / videosWithRetention.length
    : null

  const isFamousTab = activeTab === 'famous-en' || activeTab === 'famous-zh'

  const weekGroups = useMemo(
    () => isFamousTab ? [] : buildGamesWeekGroups(filteredVideos, strategies),
    [filteredVideos, strategies, isFamousTab],
  )

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

      {/* ── tabs ── */}
      <div className="flex gap-1 mb-6 border-b">
        {/* Self-play tabs */}
        {(['en', 'zh'] as GamesTab[]).map(tab => {
          const meta  = TAB_META[tab]
          const count = tabVideos[tab].length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {meta.label}
              {!loading && count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
              )}
            </button>
          )
        })}

        {/* Divider */}
        <div className="w-px bg-border mx-1 self-stretch my-1" />

        {/* Famous tabs */}
        {(['famous-en', 'famous-zh'] as GamesTab[]).map(tab => {
          const meta  = TAB_META[tab]
          const count = tabVideos[tab].length
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-amber-500 text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {meta.emoji} {meta.label}
              {!loading && count > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
              )}
            </button>
          )
        })}

        {/* Playlist link (only for selfplay tabs) */}
        {!isFamousTab && TAB_META[activeTab].playlist && (
          <a
            href={`https://www.youtube.com/playlist?list=${TAB_META[activeTab].playlist}`}
            target="_blank" rel="noopener noreferrer"
            className="ml-auto self-center text-xs text-muted-foreground hover:text-foreground transition-colors pb-2"
          >
            ↗ playlist
          </a>
        )}
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
          {/* ── stat cards ── */}
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
              sub={isFamousTab
                ? `${TAB_META[activeTab].label} famous`
                : `${TAB_META[activeTab].label} self-play`}
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

          {/* ── viewer country + subtitle (only on selfplay tabs to avoid clutter) ── */}
          {!isFamousTab && countries.length > 0 && <AudienceMap rows={countries} />}
          {!isFamousTab && <SubtitleLangChart rows={subtitles} />}

          {/* ── notices (selfplay only) ── */}
          {!isFamousTab && (
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
          )}

          {/* ── video list ── */}
          {isFamousTab ? (
            <FamousSideBySide
              videos={filteredVideos}
              lang={activeTab as 'famous-en' | 'famous-zh'}
            />
          ) : filteredVideos.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <p className="text-4xl mb-3">🎬</p>
              <p className="font-medium">
                {videos.length === 0 ? 'No video data yet' : `No ${TAB_META[activeTab].label} videos yet`}
              </p>
              {videos.length === 0 && (
                <p className="text-sm mt-1">
                  Click <strong>↻ Refresh</strong> to fetch from YouTube.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* ── weekly breakdown by strategy period ── */}
              <div className="flex flex-col gap-4 mb-8">
                {weekGroups.map((group, idx) => (
                  <GamesWeekBlock
                    key={group.weekKey}
                    group={group}
                    previousGroup={weekGroups[idx + 1]}
                  />
                ))}
              </div>

              {/* ── flat video list ── */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-semibold">📋 All Videos</h2>
                <span className="text-xs text-muted-foreground">
                  {filteredVideos.length} videos · newest first
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {filteredVideos.map(v => (
                  <VideoCard key={v.video_id} video={v} />
                ))}
              </div>
            </>
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
