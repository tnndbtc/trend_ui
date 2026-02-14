const CLIENT_ID_KEY = 'trend_ui_client_id'

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
