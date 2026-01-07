import { SlidingWindowRateLimiter } from "./rate-limiter.js"

const BASE_URL = "https://api.unusualwhales.com"
const REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_RATE_LIMIT_PER_MINUTE = 120

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
}

// Initialize rate limiter from environment variable or default
const rateLimitPerMinute = parseInt(
  process.env.UW_RATE_LIMIT_PER_MINUTE || String(DEFAULT_RATE_LIMIT_PER_MINUTE),
  10,
)
const rateLimiter = new SlidingWindowRateLimiter(
  isNaN(rateLimitPerMinute) ? DEFAULT_RATE_LIMIT_PER_MINUTE : rateLimitPerMinute,
)

/**
 * Safely encode a value for use in a URL path segment.
 * Validates and encodes the value to prevent path traversal attacks.
 *
 * @param value - The value to encode (will be converted to string)
 * @returns The URL-encoded path segment
 * @throws {Error} If value is null/undefined or contains invalid characters (/, \, ..)
 */
export function encodePath(value: unknown): string {
  if (value === undefined || value === null) {
    throw new Error("Path parameter is required")
  }
  const str = String(value)
  if (str.includes("/") || str.includes("\\") || str.includes("..")) {
    throw new Error("Invalid path parameter")
  }
  return encodeURIComponent(str)
}

/**
 * Fetch data from the UnusualWhales API.
 *
 * @param endpoint - The API endpoint path (relative to base URL)
 * @param params - Optional query parameters to append to the URL
 * @returns Promise resolving to an ApiResponse containing data or error
 * @template T - The expected type of the response data
 */
export async function uwFetch<T = unknown>(
  endpoint: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
): Promise<ApiResponse<T>> {
  const apiKey = process.env.UW_API_KEY

  if (!apiKey) {
    return { error: "UW_API_KEY environment variable is not set" }
  }

  // Check rate limit before making request
  const rateCheck = rateLimiter.tryAcquire()
  if (!rateCheck.allowed) {
    const waitSeconds = Math.ceil((rateCheck.waitMs || 0) / 1000)
    return {
      error: `Rate limit exceeded (${rateLimitPerMinute}/min). Try again in ${waitSeconds} seconds.`,
    }
  }

  const url = new URL(endpoint, BASE_URL)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      // Skip undefined, null, empty strings, and false booleans
      if (value === undefined || value === null || value === "" || value === false) {
        return
      }
      // Handle array values (e.g., rule_name[], issue_types[])
      if (Array.isArray(value)) {
        value.forEach((item) => {
          url.searchParams.append(key, String(item))
        })
      } else {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      // Special handling for rate limit responses from the API
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after")
        const waitInfo = retryAfter ? ` Retry after ${retryAfter} seconds.` : ""
        return {
          error: `API rate limit exceeded (429).${waitInfo} You may be approaching your daily limit.`,
        }
      }

      const errorText = await response.text()
      return {
        error: `API error (${response.status}): ${errorText}`,
      }
    }

    const text = await response.text()
    if (!text) {
      return { data: {} as T }
    }

    try {
      const data = JSON.parse(text)
      return { data: data as T }
    } catch {
      return { error: `Invalid JSON response: ${text.slice(0, 100)}` }
    }
  } catch (error) {
    clearTimeout(timeout)
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "Request timed out" }
    }
    return {
      error: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Format an API response as a JSON string.
 * Returns formatted error JSON if there's an error, otherwise returns formatted data JSON.
 *
 * @param result - The API response to format
 * @returns JSON string representation of the response
 * @template T - The type of the data in the response
 */
export function formatResponse<T>(result: ApiResponse<T>): string {
  if (result.error) {
    return JSON.stringify({ error: result.error }, null, 2)
  }
  return JSON.stringify(result.data, null, 2)
}

/**
 * Format an error message as a JSON string.
 * Helper function to reduce duplication of error formatting across tools.
 *
 * @param message - The error message
 * @returns JSON string with error object
 */
export function formatError(message: string): string {
  return JSON.stringify({ error: message })
}
