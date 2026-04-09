'use client'

import { useState, useEffect } from 'react'
import type { Story } from '@/types/story'
import { fetchStoriesToday } from '@/lib/api/stories'
import { StoryCard } from '@/components/StoryCard'

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<string>('')

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchStoriesToday('zh')
        setStories(data.stories.filter(s => s.status === 'ready'))
        setDate(data.date)
      } catch (err) {
        console.error('Failed to load stories:', err)
        setError('无法加载故事，请检查 story_engine 是否运行中')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="feed-container mx-auto px-4 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Global Signal Radar</h1>
        {date && (
          <p className="text-sm text-muted-foreground mt-1">
            {date} | {stories.length} 篇故事
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

      {/* Empty state */}
      {!loading && !error && stories.length === 0 && (
        <div className="border border-border rounded-xl bg-card p-8 text-center">
          <p className="text-lg mb-1">暂无故事</p>
          <p className="text-sm text-muted-foreground">
            今天还没有生成故事。运行 run_generate.sh 来生成。
          </p>
        </div>
      )}

      {/* Story cards */}
      {!loading && !error && stories.length > 0 && (
        <div className="space-y-4">
          {stories.map((story, i) => (
            <StoryCard
              key={story.id}
              story={story}
              defaultExpanded={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
