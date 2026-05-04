'use client'

import { useState, useEffect } from 'react'
import type { Story, StorySetSummary, StoryLang, YoutubeAnalyticRow } from '@/types/story'
import { fetchStorySets, fetchStorySet, fetchAnalytics } from '@/lib/api/stories'
import { StoryCard } from '@/components/StoryCard'

const LANG_STORAGE_KEY = 'preferred_story_lang'

interface StorySetWithStories {
  set: StorySetSummary
  stories: Story[]
  loaded: boolean
}

// Channel tab definitions — each tab maps to one story_engine per-run
// overlay profile. Keep profile ids in sync with story_engine/config/story_mix_*.json.
interface ChannelTab {
  id: string              // URL query value
  label: string           // display label (Chinese)
  profile: string | null  // API filter; null = all
  description: string     // subtitle under the tab
}

const CHANNEL_TABS: ChannelTab[] = [
  { id: 'politics',      label: '政治·国际', profile: 'run3_world',         description: 'Politics / World'       },
  { id: 'ai',            label: 'AI·科技',   profile: 'run2_ai',            description: 'AI / Tech / Science'    },
  { id: 'business',      label: '商业·财经', profile: 'run4_business',      description: 'Business / Finance'     },
  { id: 'entertainment', label: '娱乐·体育', profile: 'run5_entertainment', description: 'Entertainment / Sports' },
  { id: 'others',        label: '社会·世界', profile: 'run6_others',        description: 'Society / World'        },
]

/** Format a single analytics row into a short readable string. */
function formatAnalyticsRow(row: YoutubeAnalyticRow): string {
  if (row.analytics_pulled_at === null) return '⏳ pending'
  if (row.analytics_pulled_at === 'no_data') return 'no data'
  const parts: string[] = []
  if (row.views != null)             parts.push(`${row.views.toLocaleString()} views`)
  if (row.avg_view_duration != null) parts.push(`⏱ ${Math.round(row.avg_view_duration)}s`)
  if (row.avg_view_pct != null)      parts.push(`👁 ${row.avg_view_pct.toFixed(0)}%`)
  return parts.length ? parts.join('  ') : '—'
}

/**
 * rows=undefined  → no video published for this set yet → show "📹 not published"
 * rows=[]         → published but no log row → same placeholder
 * rows=[...]      → show per-locale analytics (pending / data / no-data)
 */
function AnalyticsBadge({ rows }: { rows: YoutubeAnalyticRow[] | undefined }) {
  if (!rows || rows.length === 0) {
    return (
      <span className="text-xs text-muted-foreground/40 font-mono">
        📹 not published
      </span>
    )
  }
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map(row => (
        <span key={row.video_id} className="text-xs text-muted-foreground/70 font-mono">
          <span className="text-muted-foreground/40 mr-1">[{row.lang}]</span>
          {formatAnalyticsRow(row)}
        </span>
      ))}
    </div>
  )
}

function formatSetTime(batchTs: string): string {
  const date = new Date(batchTs)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${year}年${month}月${day}日 ${timeStr}`
}

function SetHeader({
  set,
  storyCount,
  expanded,
  onToggle,
  lang,
  analytics,
}: {
  set: StorySetSummary
  storyCount: number
  expanded: boolean
  onToggle: () => void
  lang: StoryLang
  analytics: YoutubeAnalyticRow[] | undefined
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">
          {formatSetTime(set.batch_ts)}
        </span>
        <span className="text-xs text-muted-foreground">
          {storyCount} {lang === 'en' ? 'stories' : '篇故事'}
        </span>
        {set.status === 'failed' && (
          <span className="text-xs text-destructive">生成失败</span>
        )}
        <AnalyticsBadge rows={analytics} />
      </div>
      <span className="text-xs text-muted-foreground shrink-0 ml-2">
        {expanded ? '收起 ▲' : '展开 ▼'}
      </span>
    </button>
  )
}

export default function StoriesPage() {
  const [storySets, setStorySets] = useState<StorySetWithStories[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === 'undefined') return 'politics'
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    return (tab && CHANNEL_TABS.some(t => t.id === tab)) ? tab : 'politics'
  })
  const [storyLang, setStoryLang] = useState<StoryLang>(() => {
    if (typeof window === 'undefined') return 'zh'
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as StoryLang | null
    return (saved === 'en' || saved === 'zh') ? saved : 'zh'
  })
  // Analytics keyed by story_set_id — fetched alongside stories, best-effort
  const [analyticsMap, setAnalyticsMap] = useState<Map<number, YoutubeAnalyticRow[]>>(new Map())

  const handleLangChange = (lang: StoryLang) => {
    setStoryLang(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        // Resolve current tab's profile filter.
        // English cron jobs now use the same per-channel profiles as Chinese
        // (run3_world, run2_ai, run4_business, etc.) so we apply the same
        // profile filter regardless of language.
        const tab = CHANNEL_TABS.find(t => t.id === activeTab) || CHANNEL_TABS[0]
        const profileFilter = tab.profile ?? undefined

        // Fetch story sets filtered by profile + lang
        const sets = await fetchStorySets(profileFilter, storyLang)
        if (cancelled) return

        if (sets.length > 0) {
          // Load stories and analytics for all sets in parallel
          const [setsWithStories, analyticsResults] = await Promise.all([
            // Stories
            Promise.all(sets.map(async set => {
              try {
                const data = await fetchStorySet(set.id)
                return { set, stories: data.stories.filter(s => s.status === 'ready'), loaded: true }
              } catch {
                return { set, stories: [], loaded: false }
              }
            })),
            // Analytics — best-effort; silently omit on error
            Promise.all(sets.map(async set => {
              try {
                const rows = await fetchAnalytics(set.id)
                return { id: set.id, rows }
              } catch {
                return { id: set.id, rows: [] }
              }
            })),
          ])

          if (cancelled) return

          setStorySets(setsWithStories)

          const aMap = new Map<number, YoutubeAnalyticRow[]>()
          analyticsResults.forEach(({ id, rows }) => { if (rows.length) aMap.set(id, rows) })
          setAnalyticsMap(aMap)

          // Auto-expand the latest set
          if (setsWithStories.length > 0) {
            setExpandedSets(new Set([setsWithStories[0].set.id]))
          }
        } else {
          setStorySets([])
          setAnalyticsMap(new Map())
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load stories:', err)
        setError('无法加载故事，请检查 story_engine 是否运行中')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeTab, storyLang])

  const handleTabClick = (tabId: string) => {
    if (tabId === activeTab) return
    setActiveTab(tabId)
    // Update URL query string without a full page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tabId)
      window.history.pushState({}, '', url.toString())
    }
  }

  const toggleSet = (setId: number) => {
    setExpandedSets(prev => {
      const next = new Set(prev)
      if (next.has(setId)) {
        next.delete(setId)
      } else {
        next.add(setId)
      }
      return next
    })
  }

  const isLatestSet = (index: number) => index === 0

  return (
    <div className="feed-container mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Signal Radar</h1>
          {storySets.length > 0 && !loading && (
            <p className="text-sm text-muted-foreground mt-1">
              {storySets.length} {storyLang === 'en' ? 'story sets' : '组故事'}
            </p>
          )}
        </div>

        {/* Language selector */}
        <select
          value={storyLang}
          onChange={(e) => handleLangChange(e.target.value as StoryLang)}
          className="px-3 py-1.5 text-sm rounded-md bg-secondary hover:bg-secondary/80 border border-border focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors"
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </div>

      {/* Channel tab bar */}
      <div className="mb-6 flex gap-2 border-b border-border overflow-x-auto">
        {CHANNEL_TABS.map(tab => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              }`}
              title={tab.description}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-border rounded-xl bg-card p-5 animate-pulse">
              <div className="h-4 w-20 bg-muted rounded mb-3" />
              <div className="h-6 w-3/4 bg-muted rounded mb-3" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="border border-destructive/30 rounded-xl bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-xs text-primary hover:underline"
          >
            重试
          </button>
        </div>
      )}

      {/* Story sets view */}
      {!loading && !error && storySets.length > 0 && (
        <div className="space-y-6">
          {storySets.map((sw, index) => {
            const isLatest = isLatestSet(index)
            const isExpanded = expandedSets.has(sw.set.id)

            // Profile filter already scopes the set to the right channel for
            // both zh and en. English deep stories have format='deep_story'
            // (not 'format_10x'), so show all stories in the set directly.
            const visibleStories = sw.stories

            return (
              <div key={sw.set.id}>
                {/* Set header — latest set has no collapse button */}
                {isLatest ? (
                  <div className="flex items-center gap-3 flex-wrap px-1 mb-3">
                    <span className="text-sm font-semibold text-primary">
                      {formatSetTime(sw.set.batch_ts)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {visibleStories.length} {storyLang === 'en' ? 'stories' : '篇故事'}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      最新
                    </span>
                    <AnalyticsBadge rows={analyticsMap.get(sw.set.id)} />
                  </div>
                ) : (
                  <SetHeader
                    set={sw.set}
                    storyCount={visibleStories.length}
                    expanded={isExpanded}
                    onToggle={() => toggleSet(sw.set.id)}
                    lang={storyLang}
                    analytics={analyticsMap.get(sw.set.id)}
                  />
                )}

                {/* Stories — latest always shown, others toggle */}
                {(isLatest || isExpanded) && (
                  <div className="space-y-4 mt-3">
                    {visibleStories.length > 0 ? (
                      visibleStories.map(story => (
                        <StoryCard
                          key={story.id}
                          story={story}
                          defaultExpanded={isLatest || isExpanded}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground px-4 py-2">
                        该组无可用故事
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && storySets.length === 0 && (
        <div className="border border-border rounded-xl bg-card p-8 text-center">
          {storyLang === 'en' ? (
            <>
              <p className="text-lg mb-1">No stories yet</p>
              <p className="text-sm text-muted-foreground">
                {`Run: ./run_generate.sh --deep-story --lang en --profile ${CHANNEL_TABS.find(t => t.id === activeTab)?.profile ?? 'run3_world'}`}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg mb-1">暂无故事</p>
              <p className="text-sm text-muted-foreground">
                {`该频道暂无内容 — 等待下次 ${
                    CHANNEL_TABS.find(t => t.id === activeTab)?.profile
                  } 定时任务生成`}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
