'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchMonitorServices, fetchMonitorIncidents } from '@/lib/api/monitor'
import type { MonitorServicesResponse, MonitorIncident } from '@/types/monitor'
import { StatusBadge } from '@/components/StatusBadge'
import { ServiceStatusCard } from '@/components/ServiceStatusCard'
import { LoadingCard } from '@/components/LoadingCard'
import { EmptyState } from '@/components/EmptyState'

const POLL_INTERVAL_MS = 15_000

// ── helpers ────────────────────────────────────────────────────────────────

function fmtUptime(seconds: number): string {
  const s = Math.floor(seconds)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  return `${Math.round(seconds / 60)}m`
}

// ── page ─────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [data, setData] = useState<MonitorServicesResponse | null>(null)
  const [incidents, setIncidents] = useState<MonitorIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [services, recentIncidents] = await Promise.all([
        fetchMonitorServices(),
        fetchMonitorIncidents(10),
      ])
      setData(services)
      setIncidents(recentIncidents)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach monitor service')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  if (loading && !data) {
    return (
      <div className="container py-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="container py-6">
        <EmptyState onRetry={load} />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="container py-6 flex flex-col gap-8">
      {/* ── header strip ── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm">
        <span className="font-semibold">{data.monitor.hostname}</span>
        <span className="text-muted-foreground">{data.monitor.environment}</span>
        <span className="text-muted-foreground">uptime {fmtUptime(data.monitor.uptime_seconds)}</span>
        <span className="text-muted-foreground">
          db:{' '}
          <span className={data.monitor.db === 'connected' ? 'text-green-700' : 'text-red-700'}>
            {data.monitor.db}
          </span>
        </span>
        <span className="text-muted-foreground">
          discord {data.monitor.channels.discord ? '✅' : '⛔'} · email{' '}
          {data.monitor.channels.email ? '✅' : '⛔'}
        </span>
        {error && (
          <span className="text-red-600 ml-auto text-xs">
            last refresh failed: {error}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          updated {fmtTime(data.generated_at)}
        </span>
      </div>

      {/* ── services ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Services</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.services.map((svc) => (
            <ServiceStatusCard key={svc.name} service={svc} />
          ))}
        </div>
      </section>

      {/* ── host metrics ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Host</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.host.disk.map((d) => (
            <div key={d.mount} className="rounded-xl border bg-card p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{d.mount}</div>
                <div className="text-xs text-muted-foreground">
                  {d.free_pct.toFixed(1)}% free of {d.total_gb.toFixed(1)}GB
                </div>
              </div>
              <StatusBadge state={d.state} />
            </div>
          ))}
          <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">memory</div>
              <div className="text-xs text-muted-foreground">
                {data.host.memory.available_pct.toFixed(1)}% available of{' '}
                {data.host.memory.total_gb.toFixed(1)}GB
              </div>
            </div>
            <StatusBadge state={data.host.memory.state} />
          </div>
        </div>
      </section>

      {/* ── recent incidents ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Recent incidents</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incidents recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Incident</th>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium">Check</th>
                  <th className="px-3 py-2 font-medium">Severity</th>
                  <th className="px-3 py-2 font-medium">Opened</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Cause</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.incident_id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{inc.incident_id}</td>
                    <td className="px-3 py-2">{inc.service_name}</td>
                    <td className="px-3 py-2">{inc.check_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          inc.severity === 'CRITICAL'
                            ? 'text-red-700 font-medium'
                            : 'text-orange-700 font-medium'
                        }
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{fmtTime(inc.opened_at)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {inc.recovered_at ? fmtDuration(inc.duration_seconds) : 'ongoing'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{inc.cause ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
