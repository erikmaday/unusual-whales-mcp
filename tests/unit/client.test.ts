import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { encodePath, formatResponse, formatError, uwFetch } from "../../src/client.js"

describe("encodePath", () => {
  it("returns the same value for simple tickers", () => {
    expect(encodePath("AAPL")).toBe("AAPL")
    expect(encodePath("MSFT")).toBe("MSFT")
    expect(encodePath("TSLA")).toBe("TSLA")
  })

  it("preserves dots in ticker symbols", () => {
    expect(encodePath("BRK.B")).toBe("BRK.B")
    expect(encodePath("BRK.A")).toBe("BRK.A")
  })

  it("encodes special characters", () => {
    expect(encodePath("A B")).toBe("A%20B")
    expect(encodePath("A+B")).toBe("A%2BB")
  })

  it("throws on path traversal attempts with forward slash", () => {
    expect(() => encodePath("../etc/passwd")).toThrow("Invalid path parameter")
    expect(() => encodePath("foo/bar")).toThrow("Invalid path parameter")
    expect(() => encodePath("/absolute")).toThrow("Invalid path parameter")
  })

  it("throws on path traversal attempts with backslash", () => {
    expect(() => encodePath("..\\etc\\passwd")).toThrow("Invalid path parameter")
    expect(() => encodePath("foo\\bar")).toThrow("Invalid path parameter")
  })

  it("throws on double dot sequences", () => {
    expect(() => encodePath("..")).toThrow("Invalid path parameter")
    expect(() => encodePath("foo..bar")).toThrow("Invalid path parameter")
  })

  it("throws on null", () => {
    expect(() => encodePath(null)).toThrow("Path parameter is required")
  })

  it("throws on undefined", () => {
    expect(() => encodePath(undefined)).toThrow("Path parameter is required")
  })

  it("converts numbers to strings", () => {
    expect(encodePath(123)).toBe("123")
    expect(encodePath(45.67)).toBe("45.67")
  })

  it("handles empty string by returning encoded value", () => {
    expect(encodePath("")).toBe("")
  })
})

describe("formatResponse", () => {
  it("returns formatted error JSON when error exists", () => {
    const result = { error: "Something went wrong" }
    const formatted = formatResponse(result)
    expect(formatted).toBe(JSON.stringify({ error: "Something went wrong" }, null, 2))
  })

  it("returns formatted data JSON when data exists", () => {
    const result = { data: { ticker: "AAPL", price: 150.25 } }
    const formatted = formatResponse(result)
    expect(formatted).toBe(JSON.stringify({ ticker: "AAPL", price: 150.25 }, null, 2))
  })

  it("returns formatted data for array data", () => {
    const result = { data: [{ a: 1 }, { b: 2 }] }
    const formatted = formatResponse(result)
    expect(formatted).toBe(JSON.stringify([{ a: 1 }, { b: 2 }], null, 2))
  })

  it("prioritizes error over data when both exist", () => {
    const result = { error: "Error message", data: { some: "data" } }
    const formatted = formatResponse(result)
    expect(formatted).toBe(JSON.stringify({ error: "Error message" }, null, 2))
  })

  it("returns undefined when no data or error", () => {
    const result = {}
    const formatted = formatResponse(result)
    // JSON.stringify(undefined) returns undefined (not a string)
    expect(formatted).toBeUndefined()
  })

  it("handles null data", () => {
    const result = { data: null }
    const formatted = formatResponse(result)
    expect(formatted).toBe("null")
  })
})

describe("formatError", () => {
  it("formats a simple error message", () => {
    const result = formatError("Something went wrong")
    expect(result).toBe('{"error":"Something went wrong"}')
  })

  it("formats error with special characters", () => {
    const result = formatError('Error: "quotes" and \\backslash')
    const parsed = JSON.parse(result)
    expect(parsed.error).toBe('Error: "quotes" and \\backslash')
  })

  it("formats empty error message", () => {
    const result = formatError("")
    expect(result).toBe('{"error":""}')
  })
})

describe("uwFetch", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it("returns error when API key is not set", async () => {
    delete process.env.UW_API_KEY
    const result = await uwFetch("/api/test")
    expect(result).toEqual({ error: "UW_API_KEY environment variable is not set" })
  })

  it("makes request with correct headers when API key is set", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"data": "test"}'),
    })
    vi.stubGlobal("fetch", mockFetch)

    await uwFetch("/api/test")

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/test"),
      expect.objectContaining({
        method: "GET",
        headers: {
          Authorization: "Bearer test-api-key",
          Accept: "application/json",
        },
      }),
    )
  })

  it("returns parsed JSON data on successful response", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockResponse = { ticker: "AAPL", price: 150 }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockResponse)),
    }))

    const result = await uwFetch("/api/test")
    expect(result).toEqual({ data: mockResponse })
  })

  it("returns empty object for empty response", async () => {
    process.env.UW_API_KEY = "test-api-key"

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    }))

    const result = await uwFetch("/api/test")
    expect(result).toEqual({ data: {} })
  })

  it("returns error for invalid JSON response", async () => {
    process.env.UW_API_KEY = "test-api-key"

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("not valid json"),
    }))

    const result = await uwFetch("/api/test")
    expect(result.error).toMatch(/Invalid JSON response/)
  })

  it("returns error for 429 rate limit response", async () => {
    process.env.UW_API_KEY = "test-api-key"

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: () => "60",
      },
      text: () => Promise.resolve("rate limited"),
    }))

    const result = await uwFetch("/api/test")
    expect(result.error).toMatch(/API rate limit exceeded/)
    expect(result.error).toMatch(/Retry after 60 seconds/)
  })

  it("returns error for 4xx client errors without retrying", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad request"),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await uwFetch("/api/test")
    expect(result.error).toMatch(/API error \(400\)/)
    expect(mockFetch).toHaveBeenCalledTimes(1) // No retries for 4xx
  })

  it("appends query parameters correctly", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    })
    vi.stubGlobal("fetch", mockFetch)

    await uwFetch("/api/test", { date: "2024-01-01", limit: 10 })

    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain("date=2024-01-01")
    expect(calledUrl).toContain("limit=10")
  })

  it("skips undefined, null, empty string, and false params", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    })
    vi.stubGlobal("fetch", mockFetch)

    await uwFetch("/api/test", {
      date: undefined,
      limit: 10,
      empty: "",
      nope: false,
    })

    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain("limit=10")
    expect(calledUrl).not.toContain("date")
    expect(calledUrl).not.toContain("empty")
    expect(calledUrl).not.toContain("nope")
  })

  it("handles array parameters", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    })
    vi.stubGlobal("fetch", mockFetch)

    await uwFetch("/api/test", { "expirations[]": ["2024-01-01", "2024-01-08"] })

    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain("expirations%5B%5D=2024-01-01")
    expect(calledUrl).toContain("expirations%5B%5D=2024-01-08")
  })

  it("retries on 5xx server errors", async () => {
    process.env.UW_API_KEY = "test-api-key"
    process.env.UW_MAX_RETRIES = "2"

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"success": true}'),
      })
    vi.stubGlobal("fetch", mockFetch)

    const result = await uwFetch("/api/test")
    expect(result).toEqual({ data: { success: true } })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("returns error after max retries exhausted on server error", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve("Service Unavailable"),
    })
    vi.stubGlobal("fetch", mockFetch)

    const result = await uwFetch("/api/test")
    expect(result.error).toMatch(/API error \(503\)/)
    // Default max retries is 3
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it("retries on network errors", async () => {
    process.env.UW_API_KEY = "test-api-key"
    process.env.UW_MAX_RETRIES = "2"

    const mockFetch = vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('{"recovered": true}'),
      })
    vi.stubGlobal("fetch", mockFetch)

    const result = await uwFetch("/api/test")
    expect(result).toEqual({ data: { recovered: true } })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("returns error after max retries on network failure", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"))
    vi.stubGlobal("fetch", mockFetch)

    const result = await uwFetch("/api/test")
    expect(result.error).toMatch(/Request failed: Connection refused/)
    // Default max retries is 3
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it("handles AbortError for timeout", async () => {
    process.env.UW_API_KEY = "test-api-key"
    process.env.UW_MAX_RETRIES = "1"

    const abortError = new Error("Aborted")
    abortError.name = "AbortError"

    const mockFetch = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal("fetch", mockFetch)

    const result = await uwFetch("/api/test")
    expect(result.error).toBe("Request timed out")
  })

  it("returns rate limit error without retry-after header", async () => {
    process.env.UW_API_KEY = "test-api-key"

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: {
        get: () => null,
      },
      text: () => Promise.resolve("rate limited"),
    }))

    const result = await uwFetch("/api/test")
    expect(result.error).toMatch(/API rate limit exceeded/)
    expect(result.error).not.toContain("Retry after")
  })

  it("handles true boolean params", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    })
    vi.stubGlobal("fetch", mockFetch)

    await uwFetch("/api/test", { is_active: true, count: 0 })

    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain("is_active=true")
    expect(calledUrl).toContain("count=0")
  })

  it("handles null params in object", async () => {
    process.env.UW_API_KEY = "test-api-key"

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("{}"),
    })
    vi.stubGlobal("fetch", mockFetch)

    await uwFetch("/api/test", { valid: "yes", invalid: null as unknown as string })

    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain("valid=yes")
    expect(calledUrl).not.toContain("invalid")
  })
})
