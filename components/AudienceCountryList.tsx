'use client'

/**
 * AudienceCountryList — "Viewer Countries" scorecard: flag + country name +
 * proportional bar + % share + view count, for the top 15 countries by
 * views. Shared by the KataGo page (GamesCountryRow[] → {code, views}) and
 * the Performance page (ChannelAudienceSnapshot.country, an
 * AudienceDimensionRow[] → {code, views}); both already carry raw view
 * counts per country, just under different field names, so callers map to
 * this generic shape rather than this component knowing either source type.
 */

export interface CountryViewRow {
  code:  string   // ISO 3166-1 alpha-2, e.g. "US", "TW"
  views: number
}

function countryFlag(code: string): string {
  return code.toUpperCase().replace(/[A-Z]/g, c =>
    String.fromCodePoint(c.charCodeAt(0) + 0x1F1A5)
  )
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function AudienceCountryList({ rows }: { rows: CountryViewRow[] }) {
  if (rows.length === 0) return null
  const totalViews = rows.reduce((s, r) => s + r.views, 0)
  const display    = rows.slice(0, 15)
  return (
    <div className="rounded-xl border bg-card p-4 mb-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
        Viewer Countries · lifetime
      </p>
      <div className="space-y-1.5">
        {display.map(r => {
          const pct = totalViews > 0 ? (r.views / totalViews) * 100 : 0
          return (
            <div key={r.code} className="flex items-center gap-2 text-sm">
              <span className="text-base leading-none w-6 text-center">{countryFlag(r.code)}</span>
              <span className="w-24 text-muted-foreground truncate" title={countryName(r.code)}>
                {countryName(r.code)}
              </span>
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </div>
              <span className="w-10 text-right tabular-nums text-muted-foreground text-xs">
                {pct.toFixed(1)}%
              </span>
              <span className="w-12 text-right tabular-nums text-xs">
                {fmt(r.views)}
              </span>
            </div>
          )
        })}
      </div>
      {rows.length > 15 && (
        <p className="text-xs text-muted-foreground mt-2">
          +{rows.length - 15} more countries
        </p>
      )}
    </div>
  )
}
