import { NextRequest, NextResponse } from 'next/server'
import { monitorGet } from '@/lib/monitorServer'
import type { MonitorIncident } from '@/types/monitor'

// Live status snapshot — never cache.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get('limit')
  const parsed = Number(limitParam)
  const limit = Math.min(100, Math.max(1, Number.isFinite(parsed) && parsed > 0 ? parsed : 20))

  try {
    const data = await monitorGet<MonitorIncident[]>(`/api/incidents?limit=${limit}`)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: 'monitor_unreachable', detail: String(err?.message ?? err) },
      { status: 502 }
    )
  }
}
