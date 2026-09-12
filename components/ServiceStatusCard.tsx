import type { MonitorService } from '@/types/monitor'
import { StatusBadge } from './StatusBadge'

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ServiceStatusCard({ service }: { service: MonitorService }) {
  const { availability, performance, systemd } = service.checks

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
      {/* ── header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-base">{service.name}</div>
          <div className="text-xs text-muted-foreground">{service.owner}</div>
        </div>
        <StatusBadge state={service.state} />
      </div>

      {/* ── open incident banner ── */}
      {service.open_incident && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <span className="font-semibold">{service.open_incident.severity}</span>
          {' · '}
          {service.open_incident.incident_id}
          {' · '}
          {service.open_incident.check}
          {service.open_incident.cause ? ` — ${service.open_incident.cause}` : ''}
          <div className="text-red-600 mt-0.5">since {fmtTime(service.open_incident.opened_at)}</div>
        </div>
      )}

      {/* ── checks ── */}
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Availability</span>
          <div className="flex items-center gap-2">
            {availability.latency_ms !== null && (
              <span className="text-xs text-muted-foreground">{availability.latency_ms.toFixed(1)}ms</span>
            )}
            <StatusBadge state={availability.state} />
          </div>
        </div>
        {availability.last_error && (
          <div className="text-xs text-red-600 -mt-1">{availability.last_error}</div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Performance</span>
          <div className="flex items-center gap-2">
            {performance.p95_ms !== null && (
              <span className="text-xs text-muted-foreground">p95 {performance.p95_ms.toFixed(1)}ms</span>
            )}
            <StatusBadge state={performance.state} />
          </div>
        </div>
        {performance.last_error && (
          <div className="text-xs text-orange-600 -mt-1">{performance.last_error}</div>
        )}

        {systemd && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">systemd ({systemd.unit})</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {systemd.active_state}
                {systemd.n_restarts > 0 ? ` · ${systemd.n_restarts} restarts` : ''}
              </span>
              <StatusBadge state={systemd.state} />
            </div>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        last checked {fmtTime(availability.last_checked_at)}
      </div>
    </div>
  )
}
