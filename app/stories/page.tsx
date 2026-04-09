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

function formatSetTime(batchTs: string): string {
  const date = new Date(batchTs)
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        // Fetch story sets
        const sets = await fetchStorySets()

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
          // No story sets — fall back to legacy /stories/today
          const data = await fetchStoriesToday('zh')
          setLegacyStories(data.stories.filter(s => s.status === 'ready'))
        }
      } catch (err) {
        console.error('Failed to load stories:', err)
        setError('无法加载故事，请检查 story_engine 是否运行中')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Global Signal Radar</h1>
        {storySets.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {storySets.length} 组故事
          </p>
        )}
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
            运行 story_engine setup.sh 选项 5 来生成故事
          </p>
        </div>
      )}
    </div>
  )
}
