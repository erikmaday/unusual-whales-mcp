import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { SlidingWindowRateLimiter } from "../../src/rate-limiter.js"

describe("SlidingWindowRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests within the limit", () => {
    const limiter = new SlidingWindowRateLimiter(3)

    expect(limiter.tryAcquire()).toEqual({ allowed: true })
    expect(limiter.tryAcquire()).toEqual({ allowed: true })
    expect(limiter.tryAcquire()).toEqual({ allowed: true })
  })

  it("denies requests when limit is exceeded", () => {
    const limiter = new SlidingWindowRateLimiter(2)

    expect(limiter.tryAcquire()).toEqual({ allowed: true })
    expect(limiter.tryAcquire()).toEqual({ allowed: true })

    const result = limiter.tryAcquire()
    expect(result.allowed).toBe(false)
    expect(result.waitMs).toBeDefined()
    expect(result.waitMs).toBeGreaterThan(0)
  })

  it("allows requests after the window slides", () => {
    const limiter = new SlidingWindowRateLimiter(2)

    expect(limiter.tryAcquire()).toEqual({ allowed: true })
    expect(limiter.tryAcquire()).toEqual({ allowed: true })

    // Initially denied
    expect(limiter.tryAcquire().allowed).toBe(false)

    // Advance time by 1 minute (60 seconds)
    vi.advanceTimersByTime(60_000)

    // Now should be allowed again
    expect(limiter.tryAcquire()).toEqual({ allowed: true })
  })

  it("calculates correct wait time", () => {
    const limiter = new SlidingWindowRateLimiter(1)

    // Make first request at time 0
    vi.setSystemTime(0)
    expect(limiter.tryAcquire()).toEqual({ allowed: true })

    // Try at time 30 seconds - should be denied with ~30s wait
    vi.setSystemTime(30_000)
    const result = limiter.tryAcquire()
    expect(result.allowed).toBe(false)
    expect(result.waitMs).toBe(30_000) // 60s window - 30s elapsed = 30s wait
  })

  it("handles high request limits", () => {
    const limiter = new SlidingWindowRateLimiter(120)

    for (let i = 0; i < 120; i++) {
      expect(limiter.tryAcquire()).toEqual({ allowed: true })
    }

    expect(limiter.tryAcquire().allowed).toBe(false)
  })

  it("cleans up old timestamps", () => {
    const limiter = new SlidingWindowRateLimiter(2)

    // Make 2 requests at time 0
    vi.setSystemTime(0)
    limiter.tryAcquire()
    limiter.tryAcquire()

    // Advance past window
    vi.setSystemTime(60_001)

    // Make 2 more requests - old ones should be cleaned up
    expect(limiter.tryAcquire()).toEqual({ allowed: true })
    expect(limiter.tryAcquire()).toEqual({ allowed: true })
    expect(limiter.tryAcquire().allowed).toBe(false)
  })

  it("handles sliding window correctly with mixed timing", () => {
    const limiter = new SlidingWindowRateLimiter(3)

    // Request at t=0
    vi.setSystemTime(0)
    expect(limiter.tryAcquire()).toEqual({ allowed: true })

    // Request at t=20s
    vi.setSystemTime(20_000)
    expect(limiter.tryAcquire()).toEqual({ allowed: true })

    // Request at t=40s
    vi.setSystemTime(40_000)
    expect(limiter.tryAcquire()).toEqual({ allowed: true })

    // Denied at t=40s (limit of 3 reached)
    expect(limiter.tryAcquire().allowed).toBe(false)

    // At t=61s, first request (t=0) should have expired
    vi.setSystemTime(61_000)
    expect(limiter.tryAcquire()).toEqual({ allowed: true })
  })
})
