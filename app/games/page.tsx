'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchGamesChannelStats, fetchGamesVideos, fetchGamesAudienceCountries, fetchGamesSubtitleLangs, fetchGamesStrategyChanges, fetchCommentQuestions, approveCommentQuestion, skipCommentQuestion } from '@/lib/api/stories'
import type { GamesChannelStats, GamesVideoRow, GamesComment, GamesCountryRow, GamesSubtitleRow, StrategyChange, VideoWithCommentQuestions, CommentQuestion, WinrateResult, LifeDeathResult } from '@/types/story'
import SubscriberSplitCard from '@/components/SubscriberSplitCard'

type GamesTab = 'en' | 'zh' | 'ja' | 'ko' | 'famous-en' | 'famous-zh' | 'comments'

const TAB_META: Record<GamesTab, { label: string; playlist?: string; emoji: string }> = {
  'en':        { label: 'KataGo',          emoji: '♟',   playlist: 'PL5Xv3qmUSUqUrG-NTMe2IjNP_aHcI2m-w' },
  'zh':        { label: 'KataGo Chinese',  emoji: '围棋', playlist: 'PL5Xv3qmUSUqWDllUJi9BEP_3basoWCHv0' },
  'ja':        { label: 'KataGo Japanese', emoji: '囲碁', playlist: 'PL5Xv3qmUSUqVTvMeP1c63Xv6LrC8CCi-7' },
  'ko':        { label: 'KataGo Korean',   emoji: '바둑', playlist: 'PLQBYW9JL6LFA' },
  'famous-en': { label: 'Famous EN',       emoji: '🏆' },
  'famous-zh': { label: 'Famous ZH',       emoji: '🏆' },
  'comments':  { label: 'Comments',        emoji: '💬' },
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

// ── Comments review ───────────────────────────────────────────────────────────

function LifeDeathVerdict({ lifeDeath }: { lifeDeath: LifeDeathResult }) {
  const color = lifeDeath.target_color === 'W' ? 'White' : 'Black'
  const conf  = Math.round((lifeDeath.confidence ?? 0) * 100)
  const label = ({ alive: 'ALIVE', dead: 'DEAD', unsettled: 'UNSETTLED' } as Record<string, string>)[lifeDeath.status] ?? lifeDeath.status.toUpperCase()
  const color_cls =
    lifeDeath.status === 'alive' ? 'text-green-600 dark:text-green-400' :
    lifeDeath.status === 'dead'  ? 'text-red-600 dark:text-red-400' :
                                   'text-amber-500 dark:text-amber-400'
  const own = lifeDeath.ownership_avg
  return (
    <div className="mt-2 rounded-lg border bg-muted/20 text-sm p-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className={`font-bold text-base ${color_cls}`}>{label}</span>
      <span className="text-muted-foreground">
        {color} group at <span className="font-mono text-foreground">{lifeDeath.group_anchor_gtp}</span>
        {lifeDeath.group_size > 0 && <span> ({lifeDeath.group_size} stones)</span>}
      </span>
      <span className="text-muted-foreground">· confidence <span className="tabular-nums text-foreground">{conf}%</span></span>
      <span className="text-muted-foreground">· ownership <span className="tabular-nums text-foreground">{own >= 0 ? '+' : ''}{own.toFixed(2)}</span></span>
      {lifeDeath.resolved_by && <span className="text-muted-foreground/60 text-xs">via {lifeDeath.resolved_by}</span>}
    </div>
  )
}

function WinrateTable({ result, whatifMoves }: { result: WinrateResult; whatifMoves: string }) {
  const forkDelta = result.steps.length > 0
    ? result.steps[0].winrate - result.fork_winrate
    : null

  function deltaLabel(delta: number): string {
    const sign = delta >= 0 ? '+' : ''
    return `${sign}${delta.toFixed(1)}%`
  }

  function deltaColor(delta: number): string {
    // Positive delta = Black gains → green; negative = Black loses → orange
    if (Math.abs(delta) < 0.3) return 'text-muted-foreground'
    return delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-500'
  }

  return (
    <div className="mt-2 rounded-lg border bg-muted/20 text-xs overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">Position</th>
            <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Black Win%</th>
            <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Score</th>
            <th className="text-right px-3 py-1.5 font-medium text-muted-foreground">Δ Win%</th>
          </tr>
        </thead>
        <tbody>
          {/* Fork row */}
          <tr className="border-b">
            <td className="px-3 py-1.5 font-medium">Before fork (at move {result.fork_winrate != null ? '' : '…'})</td>
            <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{result.fork_winrate.toFixed(1)}%</td>
            <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
              {result.fork_score >= 0 ? '+' : ''}{result.fork_score.toFixed(1)}
            </td>
            <td className="px-3 py-1.5 text-right">—</td>
          </tr>
          {/* Step rows */}
          {result.steps.map((step, i) => {
            const prevWinrate = i === 0 ? result.fork_winrate : result.steps[i - 1].winrate
            const delta = step.winrate - prevWinrate
            return (
              <tr key={i} className={i < result.steps.length - 1 ? 'border-b' : ''}>
                <td className="px-3 py-1.5">
                  <span className={`inline-flex items-center gap-1 font-medium ${step.color === 'Black' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <span className={`w-2 h-2 rounded-full inline-block ${step.color === 'Black' ? 'bg-foreground' : 'bg-muted-foreground border border-foreground'}`} />
                    {step.color} {step.move}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{step.winrate.toFixed(1)}%</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                  {step.score >= 0 ? '+' : ''}{step.score.toFixed(1)}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums font-medium ${deltaColor(delta)}`}>
                  {deltaLabel(delta)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function QuestionCard({
  question,
  videoId,
  onApprove,
  onSkip,
}: {
  question: CommentQuestion
  videoId: string
  onApprove: (id: number) => Promise<{ reply_id?: string; error?: string }>
  onSkip: (id: number) => void
}) {
  const [acting, setActing]   = useState<'approve' | 'skip' | null>(null)
  const [postResult, setPostResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleApprove() {
    setActing('approve')
    setPostResult(null)
    try {
      const res = await onApprove(question.id)
      if (res.reply_id) {
        setPostResult({ ok: true, msg: '✅ Reply posted to video successfully.' })
      } else {
        setPostResult({ ok: false, msg: `❌ ${res.error ?? 'Unknown error'}` })
      }
    } catch (e: unknown) {
      setPostResult({ ok: false, msg: `❌ ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setActing(null)
    }
  }
  async function handleSkip() {
    setActing('skip')
    try { await onSkip(question.id) } finally { setActing(null) }
  }

  const isPosted  = postResult?.ok === true || question.status === 'replied'
  const isSkipped = question.status === 'skipped'
  const isDone    = isPosted || isSkipped
  const ytCommentUrl = `https://www.youtube.com/watch?v=${videoId}&lc=${question.comment_id}`

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      isPosted   ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20' :
      isSkipped  ? 'border-muted bg-muted/20 opacity-60' :
                   'bg-card'
    }`}>
      {/* Comment text — links directly to the YouTube comment */}
      <div className="flex gap-2 items-start mb-2">
        <a
          href={ytCommentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base leading-none mt-0.5 flex-shrink-0 hover:opacity-70 transition-opacity"
          title="View comment on YouTube"
        >💬</a>
        <a
          href={ytCommentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm leading-relaxed flex-1 hover:underline"
          title="View comment on YouTube"
        >{question.comment_text}</a>
      </div>

      {/* Meta: author, likes, move */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
        {question.author && <span>{question.author}</span>}
        {question.like_count > 0 && <span>👍 {question.like_count}</span>}
        {question.at_move != null && (
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
            Move {question.at_move}
          </span>
        )}
        {question.whatif_moves.split(' ').filter(Boolean).map((mv, i) => (
          <span key={i} className="font-mono bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded">
            {mv}
          </span>
        ))}
        {question.kind === 'life_death' && (
          <span className="font-mono bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded">
            dead/live
          </span>
        )}
        <span className="text-muted-foreground/60">{question.visits} visits</span>
      </div>

      {/* Analysis: dead/live verdict or winrate table (supporting detail) */}
      {question.kind === 'life_death' && question.life_death ? (
        <LifeDeathVerdict lifeDeath={question.life_death} />
      ) : question.result ? (
        <WinrateTable result={question.result} whatifMoves={question.whatif_moves} />
      ) : null}

      {/* Reply preview — the EXACT localized text that will be posted (matches the
          comment's language). This is what you're approving. */}
      {question.reply_preview && (
        <div className="mt-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 p-3">
          <div className="text-[11px] uppercase tracking-wide text-blue-700 dark:text-blue-300 mb-1">
            Reply to be posted
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">{question.reply_preview}</p>
        </div>
      )}

      {/* Action buttons — hidden once posted or skipped */}
      {!isDone && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleApprove}
            disabled={acting !== null}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300 text-sm font-medium hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors disabled:opacity-50"
          >
            {acting === 'approve' ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : '✓'} Approve &amp; Post
          </button>
          <button
            onClick={handleSkip}
            disabled={acting !== null}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 text-muted-foreground"
          >
            {acting === 'skip' ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : '✗'} Skip
          </button>
        </div>
      )}

      {/* Post result feedback */}
      {postResult && (
        <p className={`mt-2 text-xs font-medium ${postResult.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {postResult.msg}
        </p>
      )}
      {!postResult && question.status === 'replied' && (
        <p className="mt-2 text-xs text-green-700 dark:text-green-400 font-medium">✅ Reply posted to video successfully.</p>
      )}
      {isSkipped && (
        <p className="mt-2 text-xs text-muted-foreground">✗ Skipped</p>
      )}
    </div>
  )
}

function CommentsReview() {
  const [videos, setVideos]               = useState<VideoWithCommentQuestions[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [selectedVideoDbId, setSelected]  = useState<number | null>(null)

  // local status overrides: question id → 'approved' | 'skipped'
  const [overrides, setOverrides] = useState<Record<number, string>>({})

  useEffect(() => {
    fetchCommentQuestions()
      .then(data => {
        setVideos(data)
        if (data.length > 0) setSelected(data[0].video_db_id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const selectedVideo = videos.find(v => v.video_db_id === selectedVideoDbId) ?? null

  async function handleApprove(id: number): Promise<{ reply_id?: string; error?: string }> {
    try {
      const res = await approveCommentQuestion(id)
      if (res.status === 'posted') {
        setOverrides(prev => ({ ...prev, [id]: 'replied' }))
        return { reply_id: res.reply_id }
      }
      return { error: res.status }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { error: msg }
    }
  }
  async function handleSkip(id: number) {
    await skipCommentQuestion(id)
    setOverrides(prev => ({ ...prev, [id]: 'skipped' }))
  }

  function effectiveStatus(q: CommentQuestion): string {
    return overrides[q.id] ?? q.status
  }

  function pendingCount(v: VideoWithCommentQuestions): number {
    return v.questions.filter(q => effectiveStatus(q) === 'analyzed').length
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    )
  }
  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        <p className="text-4xl mb-3">💬</p>
        <p className="font-medium">No analyzed comment questions yet</p>
        <p className="text-sm mt-1">Run <code className="font-mono bg-muted px-1 py-0.5 rounded">fetch_and_parse_comments.py</code> then <code className="font-mono bg-muted px-1 py-0.5 rounded">run_whatif_worker.py</code> to populate.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Video picker ── */}
      <div className="rounded-xl border overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Videos with comment questions
          </p>
        </div>
        <div className="divide-y">
          {videos.map(v => {
            const isSelected = v.video_db_id === selectedVideoDbId
            const pending    = pendingCount(v)
            const total      = v.questions.length
            const ytUrl      = `https://www.youtube.com/watch?v=${v.video_id}`
            return (
              <button
                key={v.video_db_id}
                onClick={() => setSelected(v.video_db_id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                  isSelected ? 'bg-muted/50' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-20 h-[45px] rounded overflow-hidden bg-muted">
                  <img
                    src={`https://i.ytimg.com/vi/${v.video_id}/mqdefault.jpg`}
                    alt={v.title ?? v.video_id}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Title + counts */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2">
                    {v.title ?? v.video_id}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {pending > 0 && (
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {pending} pending
                      </span>
                    )}
                    {pending < total && (
                      <span className="text-xs text-muted-foreground">
                        {total - pending} done
                      </span>
                    )}
                  </div>
                </div>
                {/* Arrow */}
                <span className="flex-shrink-0 text-muted-foreground text-xs">{isSelected ? '▼' : '▶'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Selected video detail ── */}
      {selectedVideo && (() => {
        const ytUrl = `https://www.youtube.com/watch?v=${selectedVideo.video_id}`
        const questions = selectedVideo.questions.map(q => ({
          ...q,
          status: effectiveStatus(q),
        }))
        const pending  = questions.filter(q => q.status === 'analyzed').length
        const approved = questions.filter(q => q.status === 'approved').length
        const skipped  = questions.filter(q => q.status === 'skipped').length

        return (
          <div className="rounded-xl border overflow-hidden">
            {/* Video header */}
            <div className="px-4 py-3 flex gap-4 items-start border-b bg-muted/10">
              <a
                href={ytUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-32 h-[72px] rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                title="Open video on YouTube"
              >
                <img
                  src={`https://i.ytimg.com/vi/${selectedVideo.video_id}/mqdefault.jpg`}
                  alt={selectedVideo.title ?? selectedVideo.video_id}
                  className="w-full h-full object-cover"
                />
              </a>
              <div className="flex-1 min-w-0">
                <a
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold hover:underline leading-snug line-clamp-2 block"
                >
                  {selectedVideo.title ?? selectedVideo.video_id}
                </a>
                <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                  {pending  > 0 && <span className="text-orange-600 dark:text-orange-400 font-medium">⏳ {pending} pending</span>}
                  {approved > 0 && <span className="text-green-600 dark:text-green-400 font-medium">✓ {approved} approved</span>}
                  {skipped  > 0 && <span className="text-muted-foreground">✗ {skipped} skipped</span>}
                </div>
                <a
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ↗ Open on YouTube
                </a>
              </div>
            </div>

            {/* Question cards */}
            <div className="px-4 py-3 flex flex-col gap-3">
              {questions.map((q, i) => (
                <div key={q.id}>
                  {i > 0 && <div className="border-t -mx-4 mb-3" />}
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                    Question {i + 1} / {questions.length}
                  </p>
                  <QuestionCard
                    question={q}
                    videoId={selectedVideo.video_id}
                    onApprove={handleApprove}
                    onSkip={handleSkip}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })()}
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

  // On mount: render immediately from the cached DB (fast), THEN pull LIVE from
  // YouTube in the background (same mechanism as the Refresh button — spawns
  // fetch_games_analytics.py, which live-scans the channel and upserts any newly
  // published videos) and re-load. This makes a plain page reload reflect the live
  // playlist (e.g. "KataGo Korean" 2 → 4), not just the lagging cache.
  useEffect(() => {
    let cancelled = false
    load()   // fast initial paint from the DB
    ;(async () => {
      setRefreshing(true)
      try {
        await fetch('/api/games/refresh', { method: 'POST' })
        await new Promise(r => setTimeout(r, 15_000))
        if (!cancelled) await load()   // re-load with the freshly-synced data
      } catch {
        /* keep the cached view if the live refresh fails */
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

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
  const selfplayJa  = useMemo(() => videos.filter(v => v.lang === 'ja' && !v.is_famous), [videos])
  const selfplayKo  = useMemo(() => videos.filter(v => v.lang === 'ko' && !v.is_famous), [videos])
  const famousEn    = useMemo(() => videos.filter(v => v.is_famous && (v.lang ?? 'en') === 'en'), [videos])
  const famousZh    = useMemo(() => videos.filter(v => v.is_famous && v.lang === 'zh'), [videos])

  const tabVideos: Record<GamesTab, GamesVideoRow[]> = {
    'en':        selfplayEn,
    'zh':        selfplayZh,
    'ja':        selfplayJa,
    'ko':        selfplayKo,
    'famous-en': famousEn,
    'famous-zh': famousZh,
    'comments':  [],   // not used; CommentsReview fetches its own data
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

  // Subscriber count source selection.
  //
  // subscriber_count (Data API) is authoritative and current whenever YouTube
  // returns it. real_subscriber_count is derived from Analytics
  // subscribersGained-subscribersLost, which has no data for the last ~2-3 days
  // — so it under-reports any recent subscribers and must only be used as a
  // fallback for channels that hide their public count.
  const subscriberDisplay = ((): { value: string; sub: string } => {
    const dataApi   = channel?.subscriber_count ?? null
    const analytics = channel?.real_subscriber_count ?? null
    const hidden    = channel?.subscriber_count_hidden === true

    // Normal case: YouTube gives us the real number.
    if (!hidden && dataApi != null) {
      return { value: fmt(dataApi), sub: 'channel total' }
    }
    // Fallback only. Note we do NOT fall back to dataApi here: when the count
    // is hidden YouTube reports it as 0, which would render a bogus "0".
    if (analytics != null) {
      return {
        value: fmt(analytics),
        sub: hidden ? 'est. — public count hidden' : 'est. — lags ~3 days',
      }
    }
    return { value: '—', sub: 'channel total' }
  })()

  const isFamousTab   = activeTab === 'famous-en' || activeTab === 'famous-zh'
  const isCommentsTab = activeTab === 'comments'

  const weekGroups = useMemo(
    () => (isFamousTab || isCommentsTab) ? [] : buildGamesWeekGroups(filteredVideos, strategies),
    [filteredVideos, strategies, isFamousTab, isCommentsTab],
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
        {(['en', 'zh', 'ja', 'ko'] as GamesTab[]).map(tab => {
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

        {/* Divider before Comments tab */}
        <div className="w-px bg-border mx-1 self-stretch my-1" />

        {/* Comments review tab */}
        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'comments'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          💬 Comments
        </button>

        {/* Playlist link (only for selfplay tabs) */}
        {!isFamousTab && activeTab !== 'comments' && TAB_META[activeTab].playlist && (
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

      {/* ── Comments review tab (independent of loading state) ── */}
      {activeTab === 'comments' && <CommentsReview />}

      {!loading && activeTab !== 'comments' && (
        <>
          {/* ── stat cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Subscribers"
              value={subscriberDisplay.value}
              sub={subscriberDisplay.sub}
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

          {/* ── live subscriber vs non-subscriber split (per language tab) ── */}
          {(activeTab === 'en' || activeTab === 'zh' || activeTab === 'ja' || activeTab === 'ko') && (
            <SubscriberSplitCard lang={activeTab} />
          )}

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
