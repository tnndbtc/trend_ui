'use client'

import { useState } from 'react'
import type { Story, FormatType } from '@/types/story'

interface StoryCardProps {
  story: Story
  defaultExpanded?: boolean
}

const FORMAT_LABELS: Record<string, string> = {
  explainer: '60秒解读',
  top5: '今日热点5',
  radar: '全球雷达',
  regional: '区域视角',
  two_takes: '双面观点',
  pattern: '趋势分析',
  viral: '即将爆火',
  deep_dive: '深度报道',
  deep_story: '深度报道',
  supporting: '相关报道',
  niche: '专题聚焦',
  format_10: '反直觉',
  format_11: '角色代入',
  format_12: '时间线复盘',
  format_13: '谁赢谁输',
  format_14: '关键数据',
  format_15: '谣言vs真相',
  format_16: '被忽视但重要',
  format_17: '背景补课',
  format_18: '二选一',
  format_19: '未来会怎样',
  format_20: '一句话总结',
  format_21: '最离谱新闻',
  format_22: '同类对比',
  format_23: '排行榜',
  format_24: '错误决策',
  format_25: '连锁反应',
  format_26: '情绪解读',
  format_27: '第一视角',
  format_28: '极端假设',
  format_29: '一分钟故事',
  format_30: '黑白对立',
  format_31: '评论精选',
  format_32: '误判合集',
  format_33: '关键词拆解',
  format_34: '24小时回顾',
  format_35: '标题对比',
  format_36: '冷知识',
  format_37: '幕后逻辑',
  format_38: '失败案例',
  format_39: '成功路径',
  format_40: '三点结论',
  format_41: '你需要知道的',
  format_42: '误区提醒',
  format_43: '对普通人',
  format_44: '短问短答',
  format_45: '概念解释',
  format_46: '历史对照',
}

const FORMAT_COLORS: Record<string, string> = {
  explainer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  top5: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  radar: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  regional: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  two_takes: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  pattern: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  viral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  deep_dive: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  niche: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export function StoryCard({ story, defaultExpanded = false }: StoryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const formatLabel = FORMAT_LABELS[story.format] || story.format
  const formatColor = FORMAT_COLORS[story.format] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'

  return (
    <article className="border border-border rounded-xl bg-card overflow-hidden transition-all hover:border-border/80">
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${formatColor}`}>
            {formatLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(story.generated_at)}
          </span>
          {story.sources_count > 0 && (
            <span className="text-xs text-muted-foreground">
              {story.sources_count} 源
            </span>
          )}
          {story.token_estimate != null && (
            <span className="text-xs text-muted-foreground/70" title="估算 token 用量 (字符数 ÷ 4)">
              ~{(story.token_estimate / 1000).toFixed(1)}K tokens
            </span>
          )}
        </div>

        <h2
          className="text-lg font-semibold leading-tight cursor-pointer hover:text-primary/80 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {story.title}
        </h2>
      </div>

      {/* Hook — always visible */}
      <div className="px-5 pb-3">
        <p className="text-sm text-foreground/90 leading-relaxed">
          {story.script.hook}
        </p>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-border/50 pt-3">
          {/* Bullets */}
          <ul className="space-y-2">
            {story.script.bullets.map((bullet, i) => (
              <li key={i} className="text-sm text-foreground/80 leading-relaxed pl-4 relative">
                <span className="absolute left-0 text-primary/60">{'>'}</span>
                {bullet}
              </li>
            ))}
          </ul>

          {/* Twist */}
          <div className="bg-muted/30 rounded-lg px-4 py-3 mt-2">
            <p className="text-sm text-foreground/90 leading-relaxed italic">
              {story.script.twist}
            </p>
          </div>

          {/* Sources */}
          {story.sources.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1.5">来源:</p>
              <div className="flex flex-wrap gap-2">
                {story.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary/70 hover:text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md transition-colors truncate max-w-[200px]"
                    title={source.title}
                  >
                    {source.platform}: {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t border-border/30"
      >
        {expanded ? '收起 ▲' : '展开全文 ▼'}
      </button>
    </article>
  )
}
