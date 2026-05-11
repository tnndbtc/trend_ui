'use client'

import { useEffect, useState } from 'react'
import { fetchVideoComments } from '@/lib/api/stories'
import type { StoryWithComments, VideoComment } from '@/types/story'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function langFlag(lang: string): string {
  return lang === 'zh' ? '🇨🇳' : '🇬🇧'
}

// ── sub-components ────────────────────────────────────────────────────────────

function CommentBubble({ comment }: { comment: VideoComment }) {
  const authorUrl = comment.author_channel_id
    ? `https://www.youtube.com/channel/${comment.author_channel_id}`
    : undefined

  return (
    <div className="flex gap-3 py-3 border-b last:border-0">
      {/* avatar */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground flex-shrink-0 select-none">
        {comment.author_name?.charAt(0).toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          {authorUrl ? (
            <a
              href={authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline"
            >
              {comment.author_name ?? 'Anonymous'}
            </a>
          ) : (
            <span className="text-sm font-medium">{comment.author_name ?? 'Anonymous'}</span>
          )}
          {comment.published_at && (
            <span className="text-xs text-muted-foreground">{fmtDate(comment.published_at)}</span>
          )}
        </div>
        <p className="text-sm mt-1 leading-relaxed">{comment.text}</p>
        {comment.like_count > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            👍 {comment.like_count}
          </p>
        )}
      </div>
    </div>
  )
}

function StoryCommentCard({ story }: { story: StoryWithComments }) {
  const videoUrl = `https://www.youtube.com/watch?v=${story.video_id}`

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* story header */}
      <div className="px-5 py-4 bg-muted/30 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{langFlag(story.lang)}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {story.upload_profile}
              </span>
              {story.published_at && (
                <span className="text-xs text-muted-foreground">
                  · {fmtDate(story.published_at)}
                </span>
              )}
            </div>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-base leading-snug hover:underline"
            >
              {story.story_title ?? story.video_id}
            </a>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {story.comments.length} comment{story.comments.length !== 1 ? 's' : ''}
            </span>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ▶ Watch
            </a>
          </div>
        </div>
      </div>

      {/* comments */}
      <div className="px-5 divide-y">
        {story.comments.map(c => (
          <CommentBubble key={c.comment_id} comment={c} />
        ))}
      </div>
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function CommentsPage() {
  const [stories, setStories]       = useState<StoryWithComments[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const totalComments = stories.reduce((n, s) => n + s.comments.length, 0)

  function load() {
    return fetchVideoComments()
      .then(setStories)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch('/api/comments/refresh', { method: 'POST' })
      // Give the script ~15 s to finish, then reload
      await new Promise(r => setTimeout(r, 15_000))
      setLoading(true)
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">

      {/* header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Viewer Comments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comments left by viewers on published videos.
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

      {/* loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Loading...
        </div>
      )}

      {/* error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* empty */}
      {!loading && !error && stories.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-medium">No comments fetched yet</p>
          <p className="text-sm mt-1">
            Run <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">fetch_video_comments.py</code> to sync from YouTube.
          </p>
        </div>
      )}

      {/* story cards */}
      {!loading && stories.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {totalComments} comment{totalComments !== 1 ? 's' : ''} across {stories.length} video{stories.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-col gap-4">
            {stories.map(s => (
              <StoryCommentCard key={s.video_id} story={s} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
