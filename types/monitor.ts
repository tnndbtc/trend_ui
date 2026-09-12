/**
 * TypeScript types for the monitor status API responses.
 * Must match ~/data/code/monitor/API.md — mirrors the live-verified JSON
 * exactly (checked with real curl calls against 192.168.86.49:3003 while
 * planning this integration).
 */

export type MonitorState =
  | 'HEALTHY'
  | 'SUSPECTED'
  | 'PENDING'
  | 'DEGRADED'
  | 'FAILED'
  | 'RECOVERED'
  | 'SKIPPED'

export interface MonitorCheckAvailability {
  state: MonitorState
  consecutive_failures: number
  last_checked_at: string
  last_success_at: string | null
  http_status: number | null
  latency_ms: number | null
  last_error: string | null
}

export interface MonitorCheckPerformance {
  state: MonitorState
  p95_ms: number | null
  failure_rate: number
  window_seconds: number
  last_error: string | null
}

export interface MonitorCheckSystemd {
  state: MonitorState
  unit: string
  active_state: string
  n_restarts: number
  last_error: string | null
}

export interface MonitorOpenIncident {
  incident_id: string
  severity: 'CRITICAL' | 'WARNING'
  check: string
  opened_at: string
  cause: string | null
}

export interface MonitorService {
  name: string
  owner: string
  base_url: string
  health_path: string
  state: MonitorState
  checks: {
    availability: MonitorCheckAvailability
    performance: MonitorCheckPerformance
    systemd?: MonitorCheckSystemd // absent when the service declares no unit
  }
  open_incident: MonitorOpenIncident | null
}

export interface MonitorDisk {
  mount: string
  free_pct: number
  total_gb: number
  state: MonitorState
}

export interface MonitorServicesResponse {
  generated_at: string
  monitor: {
    version: string
    hostname: string
    environment: string
    uptime_seconds: number
    db: 'connected' | 'unreachable'
    channels: { discord: boolean; email: boolean }
  }
  services: MonitorService[]
  host: {
    disk: MonitorDisk[]
    memory: { available_pct: number; total_gb: number; state: MonitorState }
  }
}

export interface MonitorIncident {
  incident_id: string
  service_name: string
  check_name: string
  severity: 'CRITICAL' | 'WARNING'
  opened_at: string
  recovered_at: string | null
  duration_seconds: number | null
  cause: string | null
  reopen_count: number
  notification_count: number
}

export interface MonitorApiError {
  error: string
  detail: string
}
