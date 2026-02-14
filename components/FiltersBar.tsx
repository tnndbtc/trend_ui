'use client'

import type { FeedFilters, Region, Language, Bucket } from '@/types/trend'
import { getRegionName, getBucketName } from '@/lib/utils'

interface FiltersBarProps {
  filters: FeedFilters
  onFiltersChange: (filters: FeedFilters) => void
}

const REGIONS: Region[] = ['all', 'us', 'jp', 'kr', 'cn']

const BUCKETS: Bucket[] = [
  'hot_now',
  'rising',
  'category_tech',
  'category_sports',
  'category_entertainment',
  'category_finance',
  'category_gaming',
  'category_lifestyle',
  'category_science',
  'category_politics',
  'region_local',
  'evergreen',
]

export function FiltersBar({ filters, onFiltersChange }: FiltersBarProps) {
  const handleRegionChange = (region: Region) => {
    onFiltersChange({ ...filters, region })
  }

  const handleLanguageChange = (language: Language) => {
    onFiltersChange({ ...filters, language })
  }

  const handleBucketToggle = (bucket: Bucket) => {
    const buckets = filters.buckets.includes(bucket)
      ? filters.buckets.filter(b => b !== bucket)
      : [...filters.buckets, bucket]
    onFiltersChange({ ...filters, buckets })
  }

  const handleSurpriseToggle = () => {
    onFiltersChange({ ...filters, surprise: !filters.surprise })
  }

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search })
  }

  return (
    <div className="border-b bg-card p-4 space-y-4">
      {/* Top Row: Region, Language, Surprise */}
      <div className="flex flex-wrap gap-4">
        {/* Region Selector */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-2">Region</label>
          <select
            value={filters.region || 'all'}
            onChange={(e) => handleRegionChange(e.target.value as Region)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {REGIONS.map(region => (
              <option key={region} value={region}>
                {getRegionName(region)}
              </option>
            ))}
          </select>
        </div>

        {/* Language Toggle */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium mb-2">Language</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleLanguageChange('original')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                filters.language === 'original'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => handleLanguageChange('en-US')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                filters.language === 'en-US'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Surprise Toggle */}
        <div className="flex items-end">
          <button
            onClick={handleSurpriseToggle}
            className={`px-4 py-2 rounded-md transition-colors font-medium ${
              filters.surprise
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {filters.surprise ? '✨ Surprise ON' : '🎲 Surprise OFF'}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search titles..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-4 py-2 border rounded-md bg-background"
        />
      </div>

      {/* Bucket Multi-Select */}
      <div>
        <label className="block text-sm font-medium mb-2">Categories</label>
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map(bucket => (
            <button
              key={bucket}
              onClick={() => handleBucketToggle(bucket)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filters.buckets.includes(bucket)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {getBucketName(bucket)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
