import { getClientId } from '../storage'

const API_BASE_URL = process.env.NEXT_PUBLIC_CRAWLER_API_BASE_URL || 'http://localhost:8002/api/v1'

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Fetch wrapper with error handling and client ID injection
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  // Add client ID header
  const clientId = getClientId()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Client-Id': clientId,
    ...fetchOptions.headers,
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // Handle non-200 responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new APIError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      )
    }

    // Parse JSON response
    const data = await response.json()
    return data as T
  } catch (error) {
    if (error instanceof APIError) {
      throw error
    }

    // Network or other errors
    if (error instanceof Error) {
      throw new APIError(`Network error: ${error.message}`)
    }

    throw new APIError('Unknown error occurred')
  }
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET', params })
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body?: any,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    params,
  })
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: any,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    params,
  })
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE', params })
}
