const ONE_MINUTE_MS = 60_000

/**
 * Sliding window rate limiter to prevent exceeding API rate limits.
 * Tracks request timestamps and rejects requests that would exceed the limit.
 */
export class SlidingWindowRateLimiter {
  private timestamps: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequestsPerMinute: number) {
    this.maxRequests = maxRequestsPerMinute
    this.windowMs = ONE_MINUTE_MS
  }

  /**
   * Check if a request can proceed. If yes, records the request.
   * @returns Object with allowed boolean and waitMs if rate limited
   */
  tryAcquire(): { allowed: boolean; waitMs?: number } {
    const now = Date.now()

    // Remove timestamps outside the sliding window
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs)

    if (this.timestamps.length >= this.maxRequests) {
      // Calculate how long until the oldest request exits the window
      const oldestTimestamp = this.timestamps[0]
      const waitMs = this.windowMs - (now - oldestTimestamp)
      return { allowed: false, waitMs }
    }

    this.timestamps.push(now)
    return { allowed: true }
  }
}
