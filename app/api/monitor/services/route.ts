import { NextResponse } from 'next/server'
import { monitorGet } from '@/lib/monitorServer'
import type { MonitorServicesResponse } from '@/types/monitor'

// Live status snapshot — never cache.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await monitorGet<MonitorServicesResponse>('/api/services')
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json(
      { error: 'monitor_unreachable', detail: String(err?.message ?? err) },
      { status: 502 }
    )
  }
}
