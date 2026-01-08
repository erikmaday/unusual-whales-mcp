import { logger } from "./logger.js"
import { SlidingWindowRateLimiter } from "./rate-limiter.js"

const BASE_URL = "https://api.unusualwhales.com"
const REQUEST_TIMEOUT_MS = 30_000
const DEFAULT_RATE_LIMIT_PER_MINUTE = 120
const DEFAULT_MAX_RETRIES = 3
const BASE_RETRY_DELAY_MS = 1000

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

// Initialize max retries from environment variable or default
const maxRetries = parseInt(
  process.env.UW_MAX_RETRIES || String(DEFAULT_MAX_RETRIES),
  10,
)
const configuredMaxRetries = isNaN(maxRetries) ? DEFAULT_MAX_RETRIES : maxRetries

/**
 * Determines if an error is retryable (transient failure).
 * Retries on: 5xx errors, network timeouts, connection errors
 * Does not retry on: 4xx errors (client errors), successful responses
 */
function isRetryableError(status: number | null, error?: Error): boolean {
  // Network errors (no status) are retryable
  if (status === null) {
    return true
  }
  // 5xx server errors are retryable
  if (status >= 500) {
    return true
  }
  // Timeout errors are retryable
  if (error?.name === "AbortError") {
    return true
  }
  return false
}

/**
 * Calculates the delay for exponential backoff.
 * Returns delay in ms: 1s, 2s, 4s for attempts 0, 1, 2
 */
function getRetryDelay(attempt: number): number {
  return Math.pow(2, attempt) * BASE_RETRY_DELAY_MS
}

/**
 * Delays execution for the specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
 * Fetch data from the UnusualWhales API with exponential backoff retry.
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

  let lastError: string | null = null

  for (let attempt = 0; attempt < configuredMaxRetries; attempt++) {
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

      if (response.ok) {
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
      }

      // Special handling for rate limit responses from the API (don't retry)
      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after")
        const waitInfo = retryAfter ? ` Retry after ${retryAfter} seconds.` : ""
        return {
          error: `API rate limit exceeded (429).${waitInfo} You may be approaching your daily limit.`,
        }
      }

      const errorText = await response.text()
      lastError = `API error (${response.status}): ${errorText}`

      // Don't retry 4xx client errors (except 429 which is handled above)
      if (response.status >= 400 && response.status < 500) {
        return { error: lastError }
      }

      // 5xx errors - check if we should retry
      if (isRetryableError(response.status) && attempt < configuredMaxRetries - 1) {
        const retryDelay = getRetryDelay(attempt)
        logger.warn("Retrying request after server error", {
          endpoint,
          status: response.status,
          attempt: attempt + 1,
          maxRetries: configuredMaxRetries,
          delayMs: retryDelay,
        })
        await delay(retryDelay)
        continue
      }
    } catch (error) {
      clearTimeout(timeout)
      const err = error instanceof Error ? error : new Error(String(error))

      if (err.name === "AbortError") {
        lastError = "Request timed out"
      } else {
        lastError = `Request failed: ${err.message}`
      }

      // Check if we should retry network errors
      if (isRetryableError(null, err) && attempt < configuredMaxRetries - 1) {
        const retryDelay = getRetryDelay(attempt)
        logger.warn("Retrying request after network error", {
          endpoint,
          error: err.message,
          attempt: attempt + 1,
          maxRetries: configuredMaxRetries,
          delayMs: retryDelay,
        })
        await delay(retryDelay)
        continue
      }
    }
  }

  // All retries exhausted
  return { error: lastError ?? "Max retries exceeded" }
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
