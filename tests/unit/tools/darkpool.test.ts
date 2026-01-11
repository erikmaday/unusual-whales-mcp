import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleDarkpool, darkpoolTool } from "../../../src/tools/darkpool.js"

// Mock the client module
vi.mock("../../../src/client.js", () => ({
  uwFetch: vi.fn(),
  formatResponse: vi.fn((result) => {
    if (result.error) {
      return JSON.stringify({ error: result.error }, null, 2)
    }
    return JSON.stringify(result.data, null, 2)
  }),
  formatError: vi.fn((message) => JSON.stringify({ error: message })),
  encodePath: vi.fn((value) => {
    if (value === undefined || value === null) {
      throw new Error("Path parameter is required")
    }
    const str = String(value)
    if (str.includes("/") || str.includes("\\") || str.includes("..")) {
      throw new Error("Invalid path parameter")
    }
    return encodeURIComponent(str)
  }),
}))

import { uwFetch } from "../../../src/client.js"

describe("darkpoolTool", () => {
  it("has correct name", () => {
    expect(darkpoolTool.name).toBe("uw_darkpool")
  })

  it("has a description", () => {
    expect(darkpoolTool.description).toBeDefined()
    expect(darkpoolTool.description).toContain("darkpool")
  })

  it("has inputSchema", () => {
    expect(darkpoolTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(darkpoolTool.inputSchema.oneOf || darkpoolTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(darkpoolTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleDarkpool", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleDarkpool({ action: "invalid_action" })
      expect(result).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleDarkpool({})
      expect(result).toContain("Invalid input")
    })
  })

  describe("recent action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleDarkpool({ action: "recent" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/darkpool/recent", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleDarkpool({
        action: "recent",
        date: "2024-01-15",
        limit: 100,
        min_premium: 10000,
        max_premium: 1000000,
        min_size: 1000,
        max_size: 100000,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/darkpool/recent", expect.objectContaining({
        date: "2024-01-15",
        limit: 100,
        min_premium: 10000,
        max_premium: 1000000,
        min_size: 1000,
        max_size: 100000,
      }))
    })
  })

  describe("ticker action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleDarkpool({ action: "ticker" })
      expect(result).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleDarkpool({ action: "ticker", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/darkpool/AAPL", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleDarkpool({
        action: "ticker",
        ticker: "TSLA",
        date: "2024-01-15",
        min_premium: 5000,
        max_premium: 500000,
        newer_than: "2024-01-01T00:00:00Z",
        older_than: "2024-01-31T23:59:59Z",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/darkpool/TSLA", expect.objectContaining({
        date: "2024-01-15",
        min_premium: 5000,
        max_premium: 500000,
        newer_than: "2024-01-01T00:00:00Z",
        older_than: "2024-01-31T23:59:59Z",
      }))
    })
  })
})
