'use client'

import type { Language } from '@/types/trend'

interface FiltersBarProps {
  language: Language
  onLanguageChange: (language: Language) => void
}

/**
 * Minimal filter bar with language toggle only
 * Removed all region/bucket/search filters for pure "For You" feed experience
 */
export function FiltersBar({ language, onLanguageChange }: FiltersBarProps) {
  return (
    <div className="border-b bg-card p-4">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        {/* App Title */}
        <h1 className="text-xl font-bold">For You</h1>

        {/* Language Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => onLanguageChange('original')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              language === 'original'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => onLanguageChange('en-US')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              language === 'en-US'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            English
          </button>
        </div>
      </div>
    </div>
  )
}
