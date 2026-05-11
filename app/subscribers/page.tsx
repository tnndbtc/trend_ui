'use client'

import { useEffect, useState } from 'react'
import { fetchSubscribers } from '@/lib/api/stories'
import type { YoutubeSubscriber } from '@/types/story'

// ── helpers ──────────────────────────────────────────────────────────────────

function accountAge(isoDate: string | null): string {
  if (!isoDate) return 'unknown'
  const years = (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
  if (years < 1) return `${Math.round(years * 12)}mo old`
  return `${Math.floor(years)}yr old`
}

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function profileLabel(key: string): string {
  const map: Record<string, string> = { en: '🇬🇧 EN', zh: '🇨🇳 ZH' }
  return map[key] ?? key
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  )
}

function SubscriberCard({ sub }: { sub: YoutubeSubscriber }) {
  const channelUrl = `https://www.youtube.com/channel/${sub.channel_id}`

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">

      {/* ── header row ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* avatar placeholder */}
          <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground select-none">
            {sub.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-base hover:underline"
            >
              {sub.display_name}
            </a>
            <div className="text-xs text-muted-foreground mt-0.5">
              {sub.country && <span>{sub.country} · </span>}
              {accountAge(sub.account_created)} account
            </div>
          </div>
        </div>

        {/* channel badges + subscription date */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {sub.subscribed_to.map(ch => (
            <div key={ch.profile} className="flex flex-col items-end gap-0.5">
              <a
                href={ch.channel_id ? `https://www.youtube.com/channel/${ch.channel_id}` : undefined}
                target="_blank"
                rel="noopener noreferrer"
                title={ch.channel_name}
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 transition-colors"
              >
                {ch.channel_name || profileLabel(ch.profile)}
              </a>
              {ch.subscribed_at && (
                <span className="text-xs text-muted-foreground">
                  since {new Date(ch.subscribed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── their channel stats ── */}
      <div className="flex flex-wrap gap-2">
        <StatPill label="subscribers" value={fmt(sub.subscriber_count)} />
        <StatPill label="videos"      value={fmt(sub.video_count)} />
        <StatPill label="views"       value={fmt(sub.view_count)} />
      </div>

      {/* ── description ── */}
      {sub.description && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {sub.description}
        </p>
      )}

      {/* ── public playlists ── */}
      {sub.public_playlists.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Public playlists
          </p>
          <div className="flex flex-col gap-1.5">
            {sub.public_playlists.map(pl => (
              <a
                key={pl.id}
                href={`https://www.youtube.com/playlist?list=${pl.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted hover:bg-muted/80 transition-colors group"
              >
                <span className="text-sm font-medium group-hover:underline">{pl.title}</span>
                <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                  {pl.item_count} video{pl.item_count !== 1 ? 's' : ''}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── footer ── */}
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="text-xs text-muted-foreground">
          {sub.fetched_at
            ? `Refreshed ${new Date(sub.fetched_at).toLocaleDateString()}`
            : 'Not yet refreshed'}
        </span>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          View channel →
        </a>
      </div>
    </div>
  )
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<YoutubeSubscriber[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [refreshing, setRefreshing]   = useState(false)

  function load() {
    return fetchSubscribers()
      .then(setSubscribers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetch('/api/subscribers/refresh', { method: 'POST' })
      // Give the script ~10 s to finish, then reload
      await new Promise(r => setTimeout(r, 10_000))
      setLoading(true)
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">

      {/* ── page header ── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Public subscribers across all channels. Subscribers with private YouTube
            subscriptions are not visible even to the channel owner.
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

      {/* ── loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Loading...
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <p className="mt-1 text-xs opacity-70">
            Run <code className="font-mono">fetch_subscribers.py</code> to populate data.
          </p>
        </div>
      )}

      {/* ── empty state ── */}
      {!loading && !error && subscribers.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No subscribers yet</p>
          <p className="text-sm mt-1">
            Run <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">fetch_subscribers.py</code> to sync from YouTube.
          </p>
        </div>
      )}

      {/* ── subscriber cards ── */}
      {!loading && subscribers.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {subscribers.length} public subscriber{subscribers.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-col gap-4">
            {subscribers.map(sub => (
              <SubscriberCard key={sub.channel_id} sub={sub} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
