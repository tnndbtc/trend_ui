const CLIENT_ID_KEY   = 'trend_ui_client_id'
const LANGUAGE_KEY    = 'trend_ui_language'

// ── Language preference ────────────────────────────────────────────────────────

/**
 * Detect the user's preferred language from localStorage (saved preference)
 * or browser locale (navigator.language).
 *
 * Mapping:
 *   zh-* (any Chinese locale)  → 'zh-Hans'
 *   everything else            → 'en-US'
 *
 * Returns 'zh-Hans' as SSR fallback when window is not available.
 */
export function getPreferredLanguage(): 'en-US' | 'zh-Hans' {
  if (typeof window === 'undefined') return 'zh-Hans'  // SSR fallback

  // 1. Honour saved user preference (manual language switch)
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (saved === 'en-US' || saved === 'zh-Hans') return saved
  } catch { /* localStorage blocked */ }

  // 2. Detect from browser locale
  const lang = (navigator.language || '').toLowerCase()
  return lang.startsWith('zh') ? 'zh-Hans' : 'en-US'
}

/**
 * Persist the user's language choice to localStorage so the next visit
 * uses the same language without needing to re-detect.
 */
export function saveLanguagePreference(lang: 'en-US' | 'zh-Hans'): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LANGUAGE_KEY, lang)
  } catch { /* localStorage blocked */ }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Get or create a client ID stored in localStorage
 * This ID is sent with every API request via X-Client-Id header
 */
export function getClientId(): string {
  if (typeof window === 'undefined') {
    return '' // SSR
  }

  let clientId = localStorage.getItem(CLIENT_ID_KEY)

  if (!clientId) {
    clientId = generateUUID()
    localStorage.setItem(CLIENT_ID_KEY, clientId)
  }

  return clientId
}

/**
 * Clear the client ID (useful for testing)
 */
export function clearClientId(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CLIENT_ID_KEY)
  }
}
