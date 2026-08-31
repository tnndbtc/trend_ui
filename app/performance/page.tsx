'use client'

import { useEffect, useState, useMemo } from 'react'
import { fetchChannelVideos, fetchStrategyChanges, refreshChannelAnalytics, fetchChannelAudience, fetchChannelSubscriberSplit } from '@/lib/api/stories'
import type { ChannelVideoRow, StrategyChange, ChannelAudienceSnapshot } from '@/types/story'
import SubscriberSplitCard from '@/components/SubscriberSplitCard'
import AudienceCountryList from '@/components/AudienceCountryList'

// ── constants ─────────────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
  run2_ai:            'AI·科技',
  run3_world:         '政治·国际',
  run4_business:      '商业·财经',
  run5_entertainment: '娱乐·体育',
  run6_others:        '社会·世界',
  run7_crypto:        '加密货币',
}

const CHANNEL_IDS: Record<'en' | 'zh', string> = {
  en: 'UCPVH4BZZgKtIJHHdriEYsYw',
  zh: 'UCwQeJWrYkCdv4QygreMr2-w',
}

type Lang = 'en' | 'zh'

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

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** ISO week key: "YYYY-Www" (Monday-anchored, ISO 8601) */
function isoWeek(iso: string): string {
  const d = new Date(iso)
  // Thursday trick: find week number by shifting to nearest Thursday
  const day = d.getUTCDay() || 7          // 1=Mon … 7=Sun
  d.setUTCDate(d.getUTCDate() + 4 - day)  // shift to Thursday
  const year = d.getUTCFullYear()
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Mon – Sun label for a given ISO week key */
function weekDateRange(weekKey: string): string {
  const [year, wStr] = weekKey.split('-W')
  const week = parseInt(wStr, 10)
  // Jan 4 is always in week 1 (ISO 8601)
  const jan4 = new Date(Date.UTC(parseInt(year), 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const monday = new Date(jan4.getTime() + (1 - jan4Day + (week - 1) * 7) * 86400000)
  const sunday = new Date(monday.getTime() + 6 * 86400000)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  return `${monday.toLocaleDateString(undefined, opts)} – ${sunday.toLocaleDateString(undefined, opts)}`
}

/** Find the strategy label whose date is the most recent date ≤ the given date string */
function strategyForDate(dateStr: string, strategies: StrategyChange[]): StrategyChange | null {
  if (!strategies.length) return null
  const date = dateStr.slice(0, 10)
  // strategies are sorted newest-first
  for (const s of strategies) {
    if (s.date <= date) return s
  }
  return strategies[strategies.length - 1]
}

const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  YT_SEARCH:         'YouTube Search',
  SUGGESTED_VIDEOS:  'Suggested',
  BROWSE_FEATURES:   'Browse/Home',
  EXT_URL:           'External',
  NOTIFICATION:      'Notification',
  YT_CHANNEL:        'Channel page',
  NO_LINK_OTHER:     'Direct/Other',
  PLAYLIST:          'Playlist',
  SHORTS:            'Shorts feed',
  SUBSCRIBER:        'Subscriber feed',
}

/** Top traffic source key + its share of total views, or null if no data. */
function topTrafficSource(traffic: Record<string, number> | null | undefined): { key: string; pct: number } | null {
  if (!traffic || Object.keys(traffic).length === 0) return null
  const total = Object.values(traffic).reduce((s, v) => s + v, 0)
  if (total === 0) return null
  const [key, views] = Object.entries(traffic).sort((a, b) => b[1] - a[1])[0]
  return { key, pct: (views / total) * 100 }
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

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function CategoryBadge({ profileId }: { profileId: string | null }) {
  if (!profileId) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      {PROFILE_LABELS[profileId] ?? profileId}
    </span>
  )
}

function VideoCard({ video }: { video: ChannelVideoRow }) {
  const ytUrl     = `https://www.youtube.com/watch?v=${video.video_id}`
  const isPending = video.analytics_pulled_at === null
  const isNoData  = video.analytics_pulled_at === 'no_data'
  const topSrc    = topTrafficSource(video.traffic_sources)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <a href={ytUrl} target="_blank" rel="noopener noreferrer"
           className="flex-shrink-0 w-28 h-16 rounded-md overflow-hidden bg-muted hover:opacity-80 transition-opacity">
          <img
            src={`https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`}
            alt={video.title ?? video.video_id}
            className="w-full h-full object-cover"
          />
        </a>
        <div className="flex-1 min-w-0">
          <div className="mb-1"><CategoryBadge profileId={video.profile_id} /></div>
          <a href={ytUrl} target="_blank" rel="noopener noreferrer"
             className="text-sm font-semibold hover:underline leading-snug line-clamp-2 block mb-1.5">
            {video.title ?? video.video_id}
          </a>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="text-foreground/60">{fmtTime(video.published_at)}</span>
            <span>👁 <span className="font-medium text-foreground">{fmt(video.views)}</span></span>
            <span>⏱ <span className={`font-medium ${video.avg_view_duration != null ? 'text-foreground' : ''}`}>
              {fmtDuration(video.avg_view_duration)}
            </span></span>
            <span>📊 <span className={`font-medium ${retentionColor(video.avg_view_pct)}`}>
              {video.avg_view_pct != null ? `${video.avg_view_pct.toFixed(1)}%` : '—'}
            </span></span>
            {(video.like_count ?? 0) > 0 && (
              <span>👍 <span className="font-medium text-foreground">{fmt(video.like_count)}</span></span>
            )}
            {(video.shares ?? 0) > 0 && (
              <span>🔁 <span className="font-medium text-foreground">{fmt(video.shares)}</span></span>
            )}
            {topSrc && (
              <span title={`${topSrc.pct.toFixed(0)}% of views from this source`}>
                🧭 <span className="font-medium text-foreground">
                  {TRAFFIC_SOURCE_LABELS[topSrc.key] ?? topSrc.key}
                </span>
                <span className="text-muted-foreground/70"> {topSrc.pct.toFixed(0)}%</span>
              </span>
            )}
            {video.has_retention_curve && (
              <span title="Audience retention curve available">📈</span>
            )}
            {isPending && <span className="text-muted-foreground/60">⏳ pending</span>}
            {isNoData  && <span className="text-muted-foreground/60">📭 no data</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── weekly breakdown types ────────────────────────────────────────────────────

interface CategoryStat {
  profileId:   string
  videos:      number
  withData:    number
  avgRet:      number | null
  totalViews:  number
}

interface WeekGroup {
  weekKey:     string            // "2026-W19"
  dateRange:   string            // "May 5 – May 11"
  strategy:    StrategyChange | null
  videos:      ChannelVideoRow[]
  catStats:    CategoryStat[]
  overallRet:  number | null
  totalViews:  number
  pendingCount: number
}

function buildWeekGroups(videos: ChannelVideoRow[], strategies: StrategyChange[]): WeekGroup[] {
  // Group by ISO week
  const map = new Map<string, ChannelVideoRow[]>()
  for (const v of videos) {
    if (!v.published_at) continue
    const key = isoWeek(v.published_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(v)
  }

  const groups: WeekGroup[] = []
  for (const [weekKey, wVideos] of map) {
    // Sort videos newest-first within the week
    wVideos.sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))

    // Category stats
    const catMap = new Map<string, ChannelVideoRow[]>()
    for (const v of wVideos) {
      const pid = v.profile_id ?? 'unknown'
      if (!catMap.has(pid)) catMap.set(pid, [])
      catMap.get(pid)!.push(v)
    }

    const catStats: CategoryStat[] = []
    for (const [profileId, cvids] of catMap) {
      const withData = cvids.filter(v => v.analytics_pulled_at !== null && v.analytics_pulled_at !== 'no_data')
      const retVids  = withData.filter(v => v.avg_view_pct != null)
      catStats.push({
        profileId,
        videos:     cvids.length,
        withData:   withData.length,
        avgRet:     retVids.length > 0
                      ? retVids.reduce((s, v) => s + (v.avg_view_pct ?? 0), 0) / retVids.length
                      : null,
        totalViews: cvids.reduce((s, v) => s + (v.views ?? 0), 0),
      })
    }
    // Sort categories by retention desc, nulls last
    catStats.sort((a, b) => {
      if (a.avgRet == null && b.avgRet == null) return 0
      if (a.avgRet == null) return 1
      if (b.avgRet == null) return -1
      return b.avgRet - a.avgRet
    })

    const retVids = wVideos.filter(v => v.avg_view_pct != null)
    const overallRet = retVids.length > 0
      ? retVids.reduce((s, v) => s + (v.avg_view_pct ?? 0), 0) / retVids.length
      : null

    // Use first video's date to find the strategy (all same week so close enough)
    const firstDate = wVideos[0]?.published_at ?? ''
    const strategy  = strategyForDate(firstDate, strategies)

    groups.push({
      weekKey,
      dateRange:    weekDateRange(weekKey),
      strategy,
      videos:       wVideos,
      catStats,
      overallRet,
      totalViews:   wVideos.reduce((s, v) => s + (v.views ?? 0), 0),
      pendingCount: wVideos.filter(v => v.analytics_pulled_at === null).length,
    })
  }

  // Sort groups newest-first
  groups.sort((a, b) => b.weekKey.localeCompare(a.weekKey))
  return groups
}

// ── WeekBlock ─────────────────────────────────────────────────────────────────

function WeekBlock({
  group,
  previousGroup,
}: {
  group:         WeekGroup
  previousGroup: WeekGroup | undefined
}) {
  const [expanded, setExpanded] = useState(false)
  const allPending = group.pendingCount === group.videos.length
  const prevRet = previousGroup?.overallRet ?? null

  return (
    <div className="rounded-xl border overflow-hidden">
      {/* ── week header ── */}
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

          {/* overall stats row */}
          <div className="flex items-center gap-4 mt-1.5 text-sm flex-wrap">
            <span className="text-muted-foreground">
              {group.videos.length} videos
              {group.pendingCount > 0 && (
                <span className="ml-1 text-muted-foreground/60">· {group.pendingCount} pending</span>
              )}
            </span>
            {!allPending && (
              <>
                <span>
                  👁 <span className="font-medium">{fmt(group.totalViews)}</span>
                </span>
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
              <span className="text-xs text-muted-foreground/60">⏳ analytics not ready yet (72h wait)</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors"
        >
          {expanded ? '收起 ▲' : '展开 ▼'}
        </button>
      </div>

      {/* ── category summary table ── */}
      {!allPending && group.catStats.length > 0 && (
        <div className="px-4 py-3 border-b">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-medium pb-1.5">Category</th>
                <th className="text-right font-medium pb-1.5">Videos</th>
                <th className="text-right font-medium pb-1.5">Retention</th>
                <th className="text-right font-medium pb-1.5">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {group.catStats.map(cat => (
                <tr key={cat.profileId} className="group">
                  <td className="py-1.5 text-foreground/80">
                    {PROFILE_LABELS[cat.profileId] ?? cat.profileId}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {cat.videos}
                    {cat.withData < cat.videos && (
                      <span className="text-muted-foreground/50 ml-0.5">
                        ({cat.withData})
                      </span>
                    )}
                  </td>
                  <td className={`py-1.5 text-right tabular-nums font-medium ${retentionColor(cat.avgRet)}`}>
                    {cat.avgRet != null ? `${cat.avgRet.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {fmt(cat.totalViews)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-muted-foreground/50 mt-1.5">
            Videos (with data) · retention = avg view % · views may lag 24–72h
          </p>
        </div>
      )}

      {/* ── individual video cards ── */}
      {expanded && (
        <div className="px-4 py-3 flex flex-col gap-2">
          {group.videos.map(v => <VideoCard key={v.video_id} video={v} />)}
        </div>
      )}
    </div>
  )
}

// ── AudiencePanel ────────────────────────────────────────────────────────────

const AGE_GENDER_LABELS: Record<string, string> = {
  male: '♂', female: '♀', user_specified: '⚧', unknown: '?',
}

function AudienceBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 flex-shrink-0 text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-foreground/60 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-10 flex-shrink-0 text-right tabular-nums text-foreground">{pct.toFixed(0)}%</span>
    </div>
  )
}

function AudiencePanel({ audience }: { audience: ChannelAudienceSnapshot | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!audience) return null

  const deviceTotal   = audience.device.reduce((s, r) => s + r.metric_value, 0)
  // Country is rendered as its own standalone "Viewer Countries" section
  // (AudienceCountryList) elsewhere on the page, not in this panel — so it's
  // excluded here to avoid claiming "no data" when only device/age_gender
  // are actually empty for this panel.
  const hasAnyData    = audience.device.length + audience.age_gender.length > 0

  return (
    <div className="rounded-xl border overflow-hidden mb-5">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">👥 Audience</span>
          {audience.fetched_at && (
            <span className="text-xs text-muted-foreground">as of {fmtTime(audience.fetched_at)}</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? '收起 ▲' : '展开 ▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 py-4">
          {!hasAnyData && (
            <p className="text-sm text-muted-foreground">
              No audience data yet — populated by the next fetch_analytics.py run.
            </p>
          )}

          {audience.device.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Device
              </p>
              <div className="flex flex-col gap-1.5">
                {audience.device.map(r => (
                  <AudienceBar key={r.dim_key} label={r.dim_key}
                    pct={deviceTotal > 0 ? (r.metric_value / deviceTotal) * 100 : 0} />
                ))}
              </div>
            </div>
          )}

          {audience.age_gender.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Age &amp; gender (% of viewers)
              </p>
              <div className="flex flex-wrap gap-2">
                {audience.age_gender
                  .slice()
                  .sort((a, b) => b.metric_value - a.metric_value)
                  .map(r => {
                    const [age, gender] = r.dim_key.split('|')
                    return (
                      <span key={r.dim_key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{r.metric_value.toFixed(0)}%</span>
                        <span>{age.replace('age', '')}{AGE_GENDER_LABELS[gender] ?? gender}</span>
                      </span>
                    )
                  })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/50 mt-3">
            Channel-level snapshot, not per-video · YouTube withholds some dimensions
            (e.g. age/gender) until the channel has enough views to disaggregate
          </p>
        </div>
      )}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [activeLang,   setActiveLang]   = useState<Lang>('en')
  const [videosByLang, setVideosByLang] = useState<Record<Lang, ChannelVideoRow[]>>({ en: [], zh: [] })
  const [loadingLang,  setLoadingLang]  = useState<Record<Lang, boolean>>({ en: true, zh: true })
  const [errorLang,    setErrorLang]    = useState<Record<Lang, string | null>>({ en: null, zh: null })
  const [strategies,   setStrategies]   = useState<StrategyChange[]>([])
  const [audienceByLang, setAudienceByLang] = useState<Record<Lang, ChannelAudienceSnapshot | null>>({ en: null, zh: null })
  const [refreshing,   setRefreshing]   = useState(false)

  function loadAllLangs() {
    fetchStrategyChanges().then(setStrategies).catch(() => {})
    for (const lang of ['en', 'zh'] as Lang[]) {
      setLoadingLang(prev => ({ ...prev, [lang]: true }))
      setErrorLang(prev => ({ ...prev, [lang]: null }))
      fetchChannelVideos(lang)
        .then(vids => setVideosByLang(prev => ({ ...prev, [lang]: vids })))
        .catch(e  => setErrorLang(prev => ({ ...prev, [lang]: e.message })))
        .finally(()  => setLoadingLang(prev => ({ ...prev, [lang]: false })))
      fetchChannelAudience(lang)
        .then(a => setAudienceByLang(prev => ({ ...prev, [lang]: a })))
        .catch(() => {})   // audience panel just stays hidden on failure
    }
  }

  // Load both channels + strategy changes in parallel on mount
  useEffect(() => { loadAllLangs() }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await refreshChannelAnalytics()
      await new Promise(r => setTimeout(r, 20_000))
      loadAllLangs()
    } finally {
      setRefreshing(false)
    }
  }

  const videos  = videosByLang[activeLang]
  const loading = loadingLang[activeLang]
  const error   = errorLang[activeLang]

  const weekGroups = useMemo(
    () => buildWeekGroups(videos, strategies),
    [videos, strategies],
  )

  const totalViews = videos.reduce((s, v) => s + (v.views ?? 0), 0)
  const videosWithRetention = videos.filter(v => v.avg_view_pct != null)
  const avgRetention = videosWithRetention.length > 0
    ? videosWithRetention.reduce((s, v) => s + (v.avg_view_pct ?? 0), 0) / videosWithRetention.length
    : null
  const pendingCount = videos.filter(v => v.analytics_pulled_at === null).length

  // Most recent analytics pull timestamp across all videos
  const lastFetched = useMemo(() => {
    const dates = videos
      .map(v => v.analytics_pulled_at)
      .filter((d): d is string => !!d && d !== 'no_data')
    return dates.length > 0 ? dates.sort().reverse()[0] : null
  }, [videos])

  return (
    <div className="container max-w-3xl mx-auto px-4 py-8">

      {/* ── header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Channel Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep-story videos · views, watch time &amp; retention
            {lastFetched && (
              <span className="ml-2">· analytics refreshed {fmtTime(lastFetched)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`https://www.youtube.com/channel/${CHANNEL_IDS[activeLang]}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors hover:bg-muted"
          >
            ↗ YouTube
          </a>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 hover:bg-muted"
          >
            {refreshing ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Refreshing…
              </>
            ) : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ── EN / ZH tabs ── */}
      <div className="flex gap-1 mb-6 border-b">
        {(['en', 'zh'] as Lang[]).map(lang => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeLang === lang
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {lang === 'en' ? '🇬🇧 EN' : '🇨🇳 ZH'}
            {loadingLang[lang] && (
              <span className="ml-1.5 inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin align-middle" />
            )}
          </button>
        ))}
      </div>

      {/* ── loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading…</div>
      )}

      {/* ── error ── */}
      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-6">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── stat cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard label="Videos"       value={fmt(videos.length)} />
            <StatCard label="Total views"  value={fmt(totalViews)} />
            <StatCard
              label="Avg retention"
              value={avgRetention != null ? `${avgRetention.toFixed(1)}%` : '—'}
              sub={videosWithRetention.length > 0 ? `${videosWithRetention.length} with data` : undefined}
            />
            <StatCard label="Pending"      value={fmt(pendingCount)} sub="analytics < 72h" />
          </div>

          {/* ── retention legend ── */}
          <div className="flex items-center gap-2 mb-5 text-xs text-muted-foreground">
            <span>Retention:</span>
            <span>≥30% <span className="text-green-600 dark:text-green-400 font-medium">green</span></span>
            <span>· &lt;15% <span className="text-orange-500 font-medium">orange</span></span>
          </div>

          {/* ── live subscriber vs non-subscriber split ── */}
          <SubscriberSplitCard fetchKey={activeLang} fetchFn={fetchChannelSubscriberSplit} />

          {/* ── viewer countries ── */}
          <AudienceCountryList
            rows={(audienceByLang[activeLang]?.country ?? []).map(r => ({ code: r.dim_key, views: r.metric_value }))}
          />

          {/* ── audience snapshot (device / age+gender) ── */}
          <AudiencePanel audience={audienceByLang[activeLang]} />

          {/* ── weekly breakdown by strategy ── */}
          <div className="flex flex-col gap-4 mb-10">
            {weekGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-medium">No published videos yet</p>
              </div>
            ) : (
              weekGroups.map((group, idx) => (
                <WeekBlock
                  key={group.weekKey}
                  group={group}
                  previousGroup={weekGroups[idx + 1]}
                />
              ))
            )}
          </div>

          {/* ── all videos flat list ── */}
          {videos.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-base font-semibold">📋 All Videos</h2>
                <span className="text-xs text-muted-foreground">{videos.length} videos · newest first</span>
              </div>
              <div className="flex flex-col gap-3">
                {videos.map(v => <VideoCard key={v.video_id} video={v} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
