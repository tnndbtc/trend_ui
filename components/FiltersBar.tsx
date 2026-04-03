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

        {/* Language Dropdown */}
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
          className="px-4 py-2 text-sm rounded-md bg-secondary hover:bg-secondary/80 border border-border focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors"
        >
          <option value="zh-Hans">中文</option>
        </select>
      </div>
    </div>
  )
}
