'use client'

import { useState, useEffect } from 'react'
import type { Story, StorySetSummary } from '@/types/story'
import { fetchStorySets, fetchStorySet, fetchStoriesToday } from '@/lib/api/stories'
import { StoryCard } from '@/components/StoryCard'

interface StorySetWithStories {
  set: StorySetSummary
  stories: Story[]
  loaded: boolean
}

// Channel tab definitions — each tab maps to one story_engine per-run
// overlay profile. The 'all' tab shows every set regardless of profile.
// Keep profile ids in sync with story_engine/config/story_mix_*.json.
interface ChannelTab {
  id: string              // URL query value
  label: string           // display label (Chinese)
  profile: string | null  // API filter; null = all
  description: string     // subtitle under the tab
}

const CHANNEL_TABS: ChannelTab[] = [
  { id: 'all',      label: '全部',       profile: null,           description: '所有频道' },
  { id: 'politics', label: '政治·国际',   profile: 'run3_world',    description: 'Politics / World' },
  { id: 'ai',       label: 'AI·科技',     profile: 'run2_ai',       description: 'AI / Tech / Science' },
  { id: 'business', label: '商业·财经',   profile: 'run4_business', description: 'Business / Finance' },
]

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
  expanded,
  onToggle,
}: {
  set: StorySetSummary
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">
          {formatSetTime(set.batch_ts)}
        </span>
        <span className="text-xs text-muted-foreground">
          {set.story_count} 篇故事
        </span>
        {set.status === 'failed' && (
          <span className="text-xs text-destructive">生成失败</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {expanded ? '收起 ▲' : '展开 ▼'}
      </span>
    </button>
  )
}

export default function StoriesPage() {
  const [storySets, setStorySets] = useState<StorySetWithStories[]>([])
  const [legacyStories, setLegacyStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<string>('all')

  // Read initial tab from URL query string (for shareable links + back/forward)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && CHANNEL_TABS.some(t => t.id === tab)) {
      setActiveTab(tab)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        setLegacyStories([])

        // Resolve current tab's profile filter
        const tab = CHANNEL_TABS.find(t => t.id === activeTab) || CHANNEL_TABS[0]
        const profileFilter = tab.profile ?? undefined

        // Fetch story sets (filtered by profile if tab is not 'all')
        const sets = await fetchStorySets(profileFilter)

        if (sets.length > 0) {
          // Load stories for all sets
          const setsWithStories: StorySetWithStories[] = []
          for (const set of sets) {
            try {
              const data = await fetchStorySet(set.id)
              setsWithStories.push({
                set,
                stories: data.stories.filter(s => s.status === 'ready'),
                loaded: true,
              })
            } catch {
              setsWithStories.push({ set, stories: [], loaded: false })
            }
          }
          setStorySets(setsWithStories)

          // Auto-expand the latest set
          if (setsWithStories.length > 0) {
            setExpandedSets(new Set([setsWithStories[0].set.id]))
          }
        } else {
          setStorySets([])
          // Only fall back to legacy view on the "all" tab — for channel
          // tabs an empty result just means no batches for that channel yet.
          if (activeTab === 'all') {
            const data = await fetchStoriesToday('zh')
            setLegacyStories(data.stories.filter(s => s.status === 'ready'))
          }
        }
      } catch (err) {
        console.error('Failed to load stories:', err)
        setError('无法加载故事，请检查 story_engine 是否运行中')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeTab])

  const handleTabClick = (tabId: string) => {
    if (tabId === activeTab) return
    setActiveTab(tabId)
    // Update URL query string without a full page reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (tabId === 'all') {
        url.searchParams.delete('tab')
      } else {
        url.searchParams.set('tab', tabId)
      }
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
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Global Signal Radar</h1>
        {storySets.length > 0 && !loading && (
          <p className="text-sm text-muted-foreground mt-1">
            {storySets.length} 组故事
          </p>
        )}
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

            return (
              <div key={sw.set.id}>
                {/* Set header — latest set has no collapse button */}
                {isLatest ? (
                  <div className="flex items-center gap-3 px-1 mb-3">
                    <span className="text-sm font-semibold text-primary">
                      {formatSetTime(sw.set.batch_ts)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sw.stories.length} 篇故事
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      最新
                    </span>
                  </div>
                ) : (
                  <SetHeader
                    set={sw.set}
                    expanded={isExpanded}
                    onToggle={() => toggleSet(sw.set.id)}
                  />
                )}

                {/* Stories — latest always shown, others toggle */}
                {(isLatest || isExpanded) && (
                  <div className="space-y-4 mt-3">
                    {sw.stories.length > 0 ? (
                      sw.stories.map(story => (
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

      {/* Legacy view (no story sets) */}
      {!loading && !error && storySets.length === 0 && legacyStories.length > 0 && (
        <div className="space-y-4">
          {legacyStories.map((story, i) => (
            <StoryCard
              key={story.id}
              story={story}
              defaultExpanded={i === 0}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && storySets.length === 0 && legacyStories.length === 0 && (
        <div className="border border-border rounded-xl bg-card p-8 text-center">
          <p className="text-lg mb-1">暂无故事</p>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'all'
              ? '运行 story_engine setup.sh 选项 5 来生成故事'
              : `该频道暂无内容 — 等待下次 ${
                  CHANNEL_TABS.find(t => t.id === activeTab)?.profile
                } 定时任务生成`}
          </p>
        </div>
      )}
    </div>
  )
}
