import type { MonitorState } from '@/types/monitor'

// Colours per ~/data/code/monitor/API.md's "Suggested colours" field note:
// HEALTHY green · SUSPECTED/PENDING/DEGRADED orange · FAILED red ·
// RECOVERED blue · SKIPPED grey.
const COLORS: Record<MonitorState, string> = {
  HEALTHY: 'bg-green-100 text-green-700',
  RECOVERED: 'bg-blue-100 text-blue-700',
  SUSPECTED: 'bg-orange-100 text-orange-700',
  PENDING: 'bg-orange-100 text-orange-700',
  DEGRADED: 'bg-orange-100 text-orange-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
}

export function StatusBadge({ state }: { state: MonitorState | string }) {
  const colorClass = COLORS[state as MonitorState] ?? COLORS.SKIPPED
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {state}
    </span>
  )
}
