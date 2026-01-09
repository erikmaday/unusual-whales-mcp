import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { CircuitBreaker, CircuitState, CircuitBreakerError } from "../../src/circuit-breaker.js"

describe("CircuitBreaker", () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    vi.useFakeTimers()
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 10000,
      successThreshold: 2,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("CLOSED state", () => {
    it("should execute function successfully in CLOSED state", async () => {
      const mockFn = vi.fn().mockResolvedValue("success")
      const result = await circuitBreaker.execute(mockFn)

      expect(result).toBe("success")
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED)
    })

    it("should remain CLOSED after single failure", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("failure"))

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow("failure")
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED)
      expect(circuitBreaker.getStatus().failures).toBe(1)
    })

    it("should reset failure count on success", async () => {
      const failFn = vi.fn().mockRejectedValue(new Error("failure"))
      const successFn = vi.fn().mockResolvedValue("success")

      // Fail once
      await expect(circuitBreaker.execute(failFn)).rejects.toThrow("failure")
      expect(circuitBreaker.getStatus().failures).toBe(1)

      // Success should reset
      await circuitBreaker.execute(successFn)
      expect(circuitBreaker.getStatus().failures).toBe(0)
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED)
    })

    it("should transition to OPEN after reaching failure threshold", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("failure"))

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow("failure")
      }

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN)
      expect(circuitBreaker.getStatus().failures).toBe(3)
    })
  })

  describe("OPEN state", () => {
    beforeEach(async () => {
      // Trigger circuit to open
      const mockFn = vi.fn().mockRejectedValue(new Error("failure"))
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow("failure")
      }
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN)
    })

    it("should fail fast in OPEN state", async () => {
      const mockFn = vi.fn().mockResolvedValue("success")

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(CircuitBreakerError)
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(
        /Circuit breaker is open/,
      )

      // Should not execute the function
      expect(mockFn).not.toHaveBeenCalled()
    })

    it("should include wait time in error message", async () => {
      const mockFn = vi.fn().mockResolvedValue("success")

      try {
        await circuitBreaker.execute(mockFn)
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerError)
        if (error instanceof CircuitBreakerError) {
          expect(error.message).toMatch(/Try again in \d+s/)
          expect(error.state).toBe(CircuitState.OPEN)
          expect(error.resetAt).toBeDefined()
        }
      }
    })

    it("should transition to HALF_OPEN after reset timeout", async () => {
      const mockFn = vi.fn().mockResolvedValue("success")

      // Should be OPEN
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow(CircuitBreakerError)

      // Advance time past reset timeout
      vi.advanceTimersByTime(10000)

      // Next call should transition to HALF_OPEN and execute
      await circuitBreaker.execute(mockFn)
      expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe("HALF_OPEN state", () => {
    beforeEach(async () => {
      // Trigger circuit to open
      const failFn = vi.fn().mockRejectedValue(new Error("failure"))
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failFn)).rejects.toThrow("failure")
      }

      // Advance time to enter HALF_OPEN
      vi.advanceTimersByTime(10000)

      // Execute once to transition to HALF_OPEN
      const successFn = vi.fn().mockResolvedValue("success")
      await circuitBreaker.execute(successFn)

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.HALF_OPEN)
    })

    it("should transition to CLOSED after success threshold", async () => {
      const mockFn = vi.fn().mockResolvedValue("success")

      // First success already happened in beforeEach
      expect(circuitBreaker.getStatus().successes).toBe(1)

      // One more success should close circuit (threshold is 2)
      await circuitBreaker.execute(mockFn)

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.CLOSED)
      expect(circuitBreaker.getStatus().failures).toBe(0)
      expect(circuitBreaker.getStatus().successes).toBe(0)
    })

    it("should transition back to OPEN on failure", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("failure"))

      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow("failure")

      expect(circuitBreaker.getStatus().state).toBe(CircuitState.OPEN)
      expect(circuitBreaker.getStatus().nextAttemptTime).toBeDefined()
    })

    it("should allow requests through in HALF_OPEN state", async () => {
      const mockFn = vi.fn().mockResolvedValue("test")

      const result = await circuitBreaker.execute(mockFn)

      expect(result).toBe("test")
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe("Configuration", () => {
    it("should respect custom failure threshold", async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 10000,
        successThreshold: 2,
      })

      const mockFn = vi.fn().mockRejectedValue(new Error("failure"))

      // Fail 4 times (below threshold)
      for (let i = 0; i < 4; i++) {
        await expect(cb.execute(mockFn)).rejects.toThrow("failure")
      }
      expect(cb.getStatus().state).toBe(CircuitState.CLOSED)

      // 5th failure should open circuit
      await expect(cb.execute(mockFn)).rejects.toThrow("failure")
      expect(cb.getStatus().state).toBe(CircuitState.OPEN)
    })

    it("should respect custom reset timeout", async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 5000,
        successThreshold: 2,
      })

      const failFn = vi.fn().mockRejectedValue(new Error("failure"))
      const successFn = vi.fn().mockResolvedValue("success")

      // Open circuit
      for (let i = 0; i < 2; i++) {
        await expect(cb.execute(failFn)).rejects.toThrow("failure")
      }
      expect(cb.getStatus().state).toBe(CircuitState.OPEN)

      // Advance less than timeout
      vi.advanceTimersByTime(4000)
      await expect(cb.execute(successFn)).rejects.toThrow(CircuitBreakerError)

      // Advance to timeout
      vi.advanceTimersByTime(1000)
      await cb.execute(successFn)
      expect(cb.getStatus().state).toBe(CircuitState.HALF_OPEN)
    })

    it("should respect custom success threshold", async () => {
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 10000,
        successThreshold: 3,
      })

      const failFn = vi.fn().mockRejectedValue(new Error("failure"))
      const successFn = vi.fn().mockResolvedValue("success")

      // Open circuit
      for (let i = 0; i < 2; i++) {
        await expect(cb.execute(failFn)).rejects.toThrow("failure")
      }

      // Move to HALF_OPEN
      vi.advanceTimersByTime(10000)
      await cb.execute(successFn)
      expect(cb.getStatus().state).toBe(CircuitState.HALF_OPEN)

      // Need 3 total successes to close
      await cb.execute(successFn)
      expect(cb.getStatus().state).toBe(CircuitState.HALF_OPEN)

      await cb.execute(successFn)
      expect(cb.getStatus().state).toBe(CircuitState.CLOSED)
    })
  })

  describe("getStatus", () => {
    it("should return correct status in CLOSED state", () => {
      const status = circuitBreaker.getStatus()

      expect(status).toEqual({
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        nextAttemptTime: null,
      })
    })

    it("should return nextAttemptTime in OPEN state", async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error("failure"))

      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow("failure")
      }

      const status = circuitBreaker.getStatus()
      expect(status.state).toBe(CircuitState.OPEN)
      expect(status.nextAttemptTime).toBeGreaterThan(Date.now())
    })

    it("should track successes in HALF_OPEN state", async () => {
      const failFn = vi.fn().mockRejectedValue(new Error("failure"))
      const successFn = vi.fn().mockResolvedValue("success")

      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(failFn)).rejects.toThrow("failure")
      }

      // Move to HALF_OPEN and succeed once
      vi.advanceTimersByTime(10000)
      await circuitBreaker.execute(successFn)

      const status = circuitBreaker.getStatus()
      expect(status.state).toBe(CircuitState.HALF_OPEN)
      expect(status.successes).toBe(1)
      expect(status.nextAttemptTime).toBeNull()
    })
  })
})
