/**
 * Server-only client for the monitor status API (alma4, port 3003).
 *
 * Imported ONLY by the route handlers under app/api/monitor/* — never by
 * client components. Uses Node's `https` module directly (not fetch) so
 * that certificate verification can be relaxed for this one self-signed
 * LAN host without touching global Node TLS settings.
 *
 * See ~/data/code/monitor/API.md for the full API contract.
 */
import https from 'node:https'

const BASE = process.env.MONITOR_API_BASE_URL || 'https://192.168.86.49:3003'

// Default to true (skip verification) when unset, since the monitor's cert
// is self-signed and this is a LAN-only service (see API.md). Set
// MONITOR_API_INSECURE_TLS=false once a trusted CA/cert is wired up.
const INSECURE = process.env.MONITOR_API_INSECURE_TLS !== 'false'

// Blank while monitor auth is off. If auth is re-enabled later, paste a
// token minted via `~/data/code/monitor/setup.sh` (option 8) into
// MONITOR_API_TOKEN — no code change needed.
const TOKEN = process.env.MONITOR_API_TOKEN || ''

/**
 * GET a path from the monitor API and parse the JSON response.
 * Rejects with a descriptive Error on non-2xx, timeout, or connection
 * failure (DNS/refused/reset) — callers (route handlers) turn that into a
 * clean {error, detail} JSON response instead of an unhandled crash.
 */
export function monitorGet<T>(path: string, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    let url: URL
    try {
      url = new URL(path, BASE)
    } catch (e) {
      reject(new Error(`Invalid monitor URL: ${BASE}${path}`))
      return
    }

    const req = https.request(
      url,
      {
        method: 'GET',
        rejectUnauthorized: !INSECURE,
        headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
        timeout: timeoutMs,
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          const status = res.statusCode ?? 0
          if (status >= 200 && status < 300) {
            try {
              resolve(JSON.parse(body) as T)
            } catch {
              reject(new Error('Monitor API returned invalid JSON'))
            }
          } else {
            reject(new Error(`Monitor API ${status}: ${body.slice(0, 200)}`))
          }
        })
      }
    )

    req.on('timeout', () => {
      req.destroy(new Error(`Monitor API timed out after ${timeoutMs}ms`))
    })
    req.on('error', (err) => {
      reject(err)
    })
    req.end()
  })
}
