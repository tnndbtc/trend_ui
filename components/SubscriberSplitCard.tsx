'use client'

/**
 * SubscriberSplitCard — live subscriber vs non-subscriber view split for one
 * KataGo language tab (en | zh | ja).
 *
 * Fetches GET /api/games/subscriber-split?lang=… fresh on mount and whenever
 * `lang` changes (no cached/refresh step). Renders three KPI windows, a weekly
 * "% subscribed" trend line, and per-window split bars — mirroring the mockup.
 *
 * Honest-data details:
 *   - The most recent week is usually partial (few views); it is drawn hollow
 *     and excluded from the solid trend line so a small-sample spike can't read
 *     as a real jump.
 *   - When YouTube withholds the breakdown for a low-volume language, the API
 *     returns available=false and we show its note instead of empty charts.
 *   - "New vs returning viewers" is not offered by the YouTube API; this
 *     subscriber split is the closest available signal (stated in the footer).
 */

import { useEffect, useState } from 'react'
import { fetchGamesSubscriberSplit } from '@/lib/api/stories'
import type { GamesSubscriberSplit } from '@/types/story'

const SERIES_STYLE = `
  .subsplit { --sub:#B8791C; --sub-soft:#efe0c4; --nonsub:#3A6FBF; }
  .dark .subsplit { --sub:#BE8A22; --sub-soft:#3a3117; --nonsub:#5580CC; }
`

function nfmt(n: number): string {
  return n.toLocaleString()
}

// ── weekly "% subscribed" trend line ──────────────────────────────────────────
function TrendLine({ data }: { data: GamesSubscriberSplit }) {
  const weeks = data.weeks
  if (weeks.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough weekly history yet.</p>
  }
  const W = 420, H = 190, mL = 30, mR = 12, mT = 12, mB = 30
  const iw = W - mL - mR, ih = H - mT - mB
  const yMax = Math.max(4, Math.ceil(Math.max(...weeks.map(w => w.pct)) / 2) * 2)
  const x = (i: number) => mL + (iw * i) / (weeks.length - 1)
  const y = (v: number) => mT + ih * (1 - v / yMax)

  const solid = weeks.filter(w => !w.partial)
  const lastSolidIdx = solid.length - 1
  const partialIdx = weeks.findIndex(w => w.partial)

  const linePath = solid.map((w, i) => `${i ? 'L' : 'M'}${x(i)} ${y(w.pct)}`).join(' ')
  const areaPath = solid.length
    ? `${linePath} L${x(lastSolidIdx)} ${y(0)} L${x(0)} ${y(0)} Z`
    : ''

  const gridVals = [0, yMax / 2, yMax]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-muted-foreground"
         role="img" aria-label="Weekly percent of views from subscribers">
      {gridVals.map(g => (
        <g key={g}>
          <line x1={mL} x2={W - mR} y1={y(g)} y2={y(g)}
                stroke="currentColor" strokeWidth={1} opacity={0.14} />
          <text x={mL - 6} y={y(g) + 3.5} textAnchor="end"
                fill="currentColor" fontSize={10} className="tabular-nums" opacity={0.7}>
            {g}%
          </text>
        </g>
      ))}
      {weeks.map((w, i) => (
        (i % 2 === 0 || i === weeks.length - 1) ? (
          <text key={w.week_start} x={x(i)} y={H - 10} textAnchor="middle"
                fill="currentColor" fontSize={10} opacity={0.7}>{w.label}</text>
        ) : null
      ))}
      {areaPath && <path d={areaPath} fill="var(--sub-soft)" opacity={0.55} />}
      {linePath && (
        <path d={linePath} fill="none" stroke="var(--sub)" strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round" />
      )}
      {partialIdx > 0 && lastSolidIdx >= 0 && (
        <path d={`M${x(lastSolidIdx)} ${y(solid[lastSolidIdx].pct)} L${x(partialIdx)} ${y(weeks[partialIdx].pct)}`}
              fill="none" stroke="var(--sub)" strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />
      )}
      {weeks.map((w, i) => {
        const cx = x(i), cy = y(w.pct)
        const isLastSolid = !w.partial && i === lastSolidIdx
        return (
          <g key={`d-${w.week_start}`}>
            {w.partial ? (
              <circle cx={cx} cy={cy} r={4} fill="hsl(var(--card))" stroke="var(--sub)" strokeWidth={2} />
            ) : (
              <circle cx={cx} cy={cy} r={isLastSolid ? 4.5 : 3} fill="var(--sub)"
                      stroke="hsl(var(--card))" strokeWidth={isLastSolid ? 2 : 1.5} />
            )}
            <title>{`${w.label} · ${w.pct.toFixed(1)}% subbed · ${w.subscribed} of ${w.total} views${w.partial ? ' · partial' : ''}`}</title>
          </g>
        )
      })}
    </svg>
  )
}

// ── per-window proportional split bars ────────────────────────────────────────
function SplitBars({ data }: { data: GamesSubscriberSplit }) {
  const W = 320, H = 200, mL = 4, mR = 8, mT = 6
  const iw = W - mL - mR, rowH = 34, gap = 30
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-foreground"
         role="img" aria-label="Subscriber split by window">
      {data.windows.map((k, i) => {
        const yTop = mT + 14 + i * (rowH + gap)
        const frac = k.total > 0 ? k.subscribed / k.total : 0
        const subW = k.subscribed > 0 ? Math.max(iw * frac, 3) : 0
        const nsX = mL + subW + (k.subscribed > 0 ? 2 : 0)
        const nsW = iw - (nsX - mL)
        return (
          <g key={k.key}>
            <text x={mL} y={yTop - 6} fill="currentColor" fontSize={11}
                  className="tabular-nums" opacity={0.65}>{k.label}</text>
            {k.subscribed > 0 && (
              <rect x={mL} y={yTop} width={subW} height={rowH} rx={4} fill="var(--sub)" />
            )}
            <rect x={nsX} y={yTop} width={Math.max(nsW, 0)} height={rowH} rx={4} fill="var(--nonsub)" />
            <text x={W - mR - 6} y={yTop + rowH / 2 + 4} textAnchor="end"
                  fill="#fff" fontSize={11} fontWeight={600} className="tabular-nums">
              {nfmt(k.non_subscribed)}
            </text>
            <text x={mL} y={yTop + rowH + 14} fontSize={11} fontWeight={600}
                  className="tabular-nums" fill="var(--sub)">
              {`${k.subscribed} subbed (${k.pct.toFixed(1)}%)`}
            </text>
            <title>{`${k.label}: ${k.subscribed} subscribed · ${nfmt(k.non_subscribed)} non-sub · ${k.pct.toFixed(1)}% subscribed`}</title>
          </g>
        )
      })}
    </svg>
  )
}

export default function SubscriberSplitCard({ lang }: { lang: 'en' | 'zh' | 'ja' }) {
  const [data, setData]       = useState<GamesSubscriberSplit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setData(null)
    fetchGamesSubscriberSplit(lang)
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [lang])

  return (
    <div className="subsplit rounded-xl border bg-card p-4 mb-6">
      <style>{SERIES_STYLE}</style>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Audience source · live
          </p>
          <p className="text-sm font-semibold">Subscriber vs non-subscriber views</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--sub)' }} />
            Subscribed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--nonsub)' }} />
            Non-subscribed
          </span>
        </div>
      </div>

      {loading && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Querying YouTube Analytics…
        </div>
      )}

      {!loading && error && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Couldn’t reach the analytics service. Try refreshing the page.
        </div>
      )}

      {!loading && !error && data && !data.available && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {data.note ?? 'Subscriber breakdown is not available for this language yet.'}
        </div>
      )}

      {!loading && !error && data && data.available && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-4">
            {data.windows.map(w => (
              <div key={w.key} className="rounded-lg border bg-muted/30 px-3.5 py-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{w.label}</p>
                <p className="text-2xl font-bold tabular-nums leading-tight mt-0.5">
                  {w.pct.toFixed(1)}<span className="text-sm font-semibold text-muted-foreground ml-0.5">% subbed</span>
                </p>
                <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                  <span className="font-semibold" style={{ color: 'var(--sub)' }}>{w.subscribed}</span> of {nfmt(w.total)} views
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                % subscribed · by week
              </p>
              <p className="text-[11px] text-muted-foreground/70 mb-2">
                The subscriber engine is just starting to turn.
              </p>
              <TrendLine data={data} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                Split by window
              </p>
              <p className="text-[11px] text-muted-foreground/70 mb-2">
                Proportion of views; counts labeled.
              </p>
              <SplitBars data={data} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t space-y-1.5 text-xs text-muted-foreground">
            <p>
              <span className="uppercase tracking-wide text-[10px] border rounded px-1.5 py-0.5 mr-1.5 text-muted-foreground/80">Note</span>
              The latest week is partial and drawn hollow — a low-sample blip, not a trend.
            </p>
            <p>
              <span className="uppercase tracking-wide text-[10px] border rounded px-1.5 py-0.5 mr-1.5 text-muted-foreground/80">Limit</span>
              “New vs returning viewers” isn’t offered by the YouTube API — this subscriber split is the closest signal.
              {data.through && <> Data through {data.through}.</>}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
