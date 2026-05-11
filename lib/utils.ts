import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | null): string {
  if (!date) return 'Unknown'

  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string | null, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Get platform display name
 */
export function getPlatformName(platform: string): string {
  const platforms: Record<string, string> = {
    reddit: 'Reddit',
    youtube: 'YouTube',
    yahoo_japan: 'Yahoo! Japan',
    twitter: 'Twitter',
    tiktok: 'TikTok',
  }
  return platforms[platform] || platform
}

/**
 * Get bucket display name
 */
export function getBucketName(bucket: string): string {
  const buckets: Record<string, string> = {
    hot_now: 'Hot Now',
    rising: 'Rising',
    category_tech: 'Tech',
    category_sports: 'Sports',
    category_entertainment: 'Entertainment',
    category_finance: 'Finance',
    category_gaming: 'Gaming',
    category_lifestyle: 'Lifestyle',
    category_science: 'Science',
    category_politics: 'Politics',
    category_crypto: 'Crypto',
    region_local: 'Region Local',
    evergreen: 'Evergreen',
  }
  return buckets[bucket] || bucket
}

/**
 * Get region display name
 */
export function getRegionName(region: string): string {
  const regions: Record<string, string> = {
    us: 'United States',
    jp: 'Japan',
    kr: 'South Korea',
    cn: 'China',
    all: 'All Regions',
  }
  return regions[region] || region
}

/**
 * Format engagement signals for display
 */
export function formatEngagement(signals: Record<string, any>): string {
  const parts: string[] = []

  if (signals.views) {
    parts.push(`${formatNumber(signals.views)} views`)
  }
  if (signals.upvotes) {
    parts.push(`${formatNumber(signals.upvotes)} upvotes`)
  }
  if (signals.likes) {
    parts.push(`${formatNumber(signals.likes)} likes`)
  }
  if (signals.comments) {
    parts.push(`${formatNumber(signals.comments)} comments`)
  }

  return parts.join(' • ')
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B'
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
