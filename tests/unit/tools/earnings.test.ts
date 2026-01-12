import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleEarnings, earningsTool } from "../../../src/tools/earnings.js"

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

describe("earningsTool", () => {
  it("has correct name", () => {
    expect(earningsTool.name).toBe("uw_earnings")
  })

  it("has a description", () => {
    expect(earningsTool.description).toBeDefined()
    expect(earningsTool.description).toContain("earnings")
  })

  it("has inputSchema", () => {
    expect(earningsTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(earningsTool.inputSchema.oneOf || earningsTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(earningsTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleEarnings", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleEarnings({ action: "invalid_action" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleEarnings({})
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("premarket action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleEarnings({ action: "premarket" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/earnings/premarket", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleEarnings({
        action: "premarket",
        date: "2024-01-15",
        limit: 50,
        page: 2,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/earnings/premarket", expect.objectContaining({
        date: "2024-01-15",
        limit: 50,
        page: 2,
      }))
    })
  })

  describe("afterhours action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleEarnings({ action: "afterhours" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/earnings/afterhours", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleEarnings({
        action: "afterhours",
        date: "2024-01-15",
        limit: 100,
        page: 1,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/earnings/afterhours", expect.objectContaining({
        date: "2024-01-15",
        limit: 100,
        page: 1,
      }))
    })
  })

  describe("ticker action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleEarnings({ action: "ticker" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleEarnings({ action: "ticker", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/earnings/AAPL")
    })
  })
})
