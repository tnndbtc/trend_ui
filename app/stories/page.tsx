'use client'

import { useState, useEffect } from 'react'
import type { Story, StorySetSummary, StoryLang } from '@/types/story'
import { fetchStorySets, fetchStorySet } from '@/lib/api/stories'
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
  enFormat: string        // English format ID for per-tab filtering (formats 101–105)
}

const CHANNEL_TABS: ChannelTab[] = [
  { id: 'politics',      label: '政治·国际', profile: 'run3_world',         description: 'Politics / World',        enFormat: 'format_101' },
  { id: 'ai',            label: 'AI·科技',   profile: 'run2_ai',            description: 'AI / Tech / Science',     enFormat: 'format_102' },
  { id: 'business',      label: '商业·财经', profile: 'run4_business',      description: 'Business / Finance',      enFormat: 'format_103' },
  { id: 'entertainment', label: '娱乐·体育', profile: 'run5_entertainment', description: 'Entertainment / Sports',  enFormat: 'format_104' },
  { id: 'others',        label: '社会·世界', profile: 'run6_others',        description: 'Society / World',         enFormat: 'format_105' },
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
  storyCount,
  expanded,
  onToggle,
  lang,
}: {
  set: StorySetSummary
  storyCount: number
  expanded: boolean
  onToggle: () => void
  lang: StoryLang
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
          {storyCount} {lang === 'en' ? 'stories' : '篇故事'}
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSets, setExpandedSets] = useState<Set<number>>(new Set())
  const [activeTab, setActiveTab] = useState<string>('politics')
  const [storyLang, setStoryLang] = useState<StoryLang>('zh')

  // Restore persisted lang preference and initial tab from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as StoryLang | null
    if (saved === 'en' || saved === 'zh') setStoryLang(saved)

    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && CHANNEL_TABS.some(t => t.id === tab)) {
      setActiveTab(tab)
    }
  }, [])

  const handleLangChange = (lang: StoryLang) => {
    setStoryLang(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        // Resolve current tab's profile filter.
        // For English runs, all 5 categories are produced in one job with
        // profile_id='run_en' — the Chinese per-tab profiles (run3_world, etc.)
        // do not match. Skip the profile filter for English so the single
        // run_en story set appears on every tab.
        const tab = CHANNEL_TABS.find(t => t.id === activeTab) || CHANNEL_TABS[0]
        const profileFilter = storyLang === 'en' ? undefined : (tab.profile ?? undefined)

        // Fetch story sets filtered by profile + lang
        const sets = await fetchStorySets(profileFilter, storyLang)

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
        }
      } catch (err) {
        console.error('Failed to load stories:', err)
        setError('无法加载故事，请检查 story_engine 是否运行中')
      } finally {
        setLoading(false)
      }
    }
    load()
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

            // English: show only the story whose format matches this tab.
            // Chinese: show all stories in the set (profile filter already scoped the set).
            const tab = CHANNEL_TABS.find(t => t.id === activeTab) ?? CHANNEL_TABS[0]
            const visibleStories = storyLang === 'en'
              ? sw.stories.filter(s => s.format === tab.enFormat)
              : sw.stories

            return (
              <div key={sw.set.id}>
                {/* Set header — latest set has no collapse button */}
                {isLatest ? (
                  <div className="flex items-center gap-3 px-1 mb-3">
                    <span className="text-sm font-semibold text-primary">
                      {formatSetTime(sw.set.batch_ts)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {visibleStories.length} {storyLang === 'en' ? 'stories' : '篇故事'}
                    </span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      最新
                    </span>
                  </div>
                ) : (
                  <SetHeader
                    set={sw.set}
                    storyCount={visibleStories.length}
                    expanded={isExpanded}
                    onToggle={() => toggleSet(sw.set.id)}
                    lang={storyLang}
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
                {`Run: ./run_generate.sh 101-105 --lang en --profile run_en`}
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
