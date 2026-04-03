'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { TrendItem, Language } from '@/types/trend'
import { fetchTrendItem } from '@/lib/api/trends'
import { formatRelativeTime, getPlatformName, getBucketName, formatEngagement } from '@/lib/utils'
import { FeedbackButtons } from '@/components/FeedbackButtons'

export default function ItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const itemId = parseInt(params.id as string, 10)

  const [item, setItem] = useState<TrendItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<Language>('zh-Hans')

  useEffect(() => {
    loadItem()
  }, [itemId, language])

  const loadItem = async () => {
    setIsLoading(true)
    try {
      const data = await fetchTrendItem(itemId, language)
      setItem(data)
    } catch (error) {
      console.error('Failed to load item:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded w-3/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-semibold mb-2">Item not found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn't find the trend item you're looking for.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Back to Feed
        </button>
      </div>
    )
  }

  const platform = getPlatformName(item.platform)
  const bucket = getBucketName(item.bucket)
  const publishedTime = formatRelativeTime(item.published_at)
  const collectedTime = formatRelativeTime(item.collected_at)
  const engagement = formatEngagement(item.engagement_signals || {})

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Feed
      </button>

      {/* Article */}
      <article className="border rounded-lg p-6 bg-card">
        {/* Badges */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <span className="px-3 py-1 text-sm rounded-md bg-primary/10 text-primary font-medium">
            {platform}
          </span>
          <span className="px-3 py-1 text-sm rounded-md bg-secondary text-secondary-foreground">
            {bucket}
          </span>
          {item.rank_position && (
            <span className="px-3 py-1 text-sm rounded-md bg-accent text-accent-foreground font-semibold">
              Rank #{item.rank_position}
            </span>
          )}
          <span className="px-3 py-1 text-sm rounded-md bg-muted text-muted-foreground">
            {item.region_key.toUpperCase()}
          </span>
        </div>

        {/* Language Dropdown */}
        <div className="mb-4">
          <label className="text-sm text-muted-foreground mr-2">Language:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="px-3 py-1.5 text-sm rounded-md bg-secondary hover:bg-secondary/80 border border-border focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors"
          >
            <option value="zh-Hans">中文</option>
          </select>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">
          {item.display_title}
        </h1>

        {/* Description */}
        {item.display_description && (
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            {item.display_description}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b my-6">
          <div>
            <div className="text-sm text-muted-foreground">Platform</div>
            <div className="font-medium">{platform}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Category</div>
            <div className="font-medium">{bucket}</div>
          </div>
          {item.published_at && (
            <div>
              <div className="text-sm text-muted-foreground">Published</div>
              <div className="font-medium">{publishedTime}</div>
            </div>
          )}
          <div>
            <div className="text-sm text-muted-foreground">Collected</div>
            <div className="font-medium">{collectedTime}</div>
          </div>
          {engagement && (
            <div className="col-span-2">
              <div className="text-sm text-muted-foreground">Engagement</div>
              <div className="font-medium">{engagement}</div>
            </div>
          )}
        </div>

        {/* English Original - collapsible */}
        {language === 'zh-Hans' && (item.translations?.['en-US'] || item.original_locale === 'en-US') && (
          <details className="mb-4 group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none list-none flex items-center gap-1.5 w-fit">
              <span className="inline-block transition-transform group-open:rotate-90">▶</span>
              English original
            </summary>
            <div className="mt-2 p-3 bg-muted rounded-md text-sm text-muted-foreground space-y-1">
              {item.translations?.['en-US']?.title ? (
                <>
                  <p className="font-medium text-foreground">{item.translations['en-US'].title}</p>
                  {item.translations['en-US'].description && (
                    <p className="leading-relaxed">{item.translations['en-US'].description}</p>
                  )}
                </>
              ) : item.original_locale === 'en-US' ? (
                <>
                  <p className="font-medium text-foreground">{item.canonical_title}</p>
                  {item.canonical_description && (
                    <p className="leading-relaxed">{item.canonical_description}</p>
                  )}
                </>
              ) : null}
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <FeedbackButtons itemId={item.id} />
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            View Original Source →
          </a>
        </div>
      </article>
    </div>
  )
}
