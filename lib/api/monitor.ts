/**
 * Client-side fetchers for the Services tab. Hit trend_ui's own route
 * handlers under /api/monitor/* (server-side proxy to the real monitor
 * API on alma4) — see app/api/monitor/{services,incidents}/route.ts and
 * lib/monitorServer.ts.
 */
import type { MonitorServicesResponse, MonitorIncident, MonitorApiError } from '@/types/monitor'

// Unlike lib/api/stories.ts (which hits bare /api/* paths proxied by
// next.config.js rewrites with `basePath: false`), these are real Next.js
// Route Handlers under app/api/monitor/*, so they ARE subject to the app's
// basePath ('/app', set in next.config.js) like any other app route.
// Verified live: /api/monitor/services -> 404, /app/api/monitor/services -> 200.
const MONITOR_API_BASE = '/app/api/monitor'

async function monitorFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = json as MonitorApiError
    throw new Error(err.detail || `Monitor API error: ${res.status}`)
  }
  return json as T
}

/**
 * Fetch the full services + host-metrics snapshot.
 * Safe to poll every 10-30s per the monitor API's own guidance.
 */
export function fetchMonitorServices(): Promise<MonitorServicesResponse> {
  return monitorFetch<MonitorServicesResponse>(`${MONITOR_API_BASE}/services`)
}

/**
 * Fetch recent incidents, newest first. `limit` is clamped 1-100 by the
 * route handler.
 */
export function fetchMonitorIncidents(limit = 20): Promise<MonitorIncident[]> {
  return monitorFetch<MonitorIncident[]>(`${MONITOR_API_BASE}/incidents?limit=${limit}`)
}
