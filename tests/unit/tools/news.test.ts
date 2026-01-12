import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleNews, newsTool } from "../../../src/tools/news.js"

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

describe("newsTool", () => {
  it("has correct name", () => {
    expect(newsTool.name).toBe("uw_news")
  })

  it("has a description", () => {
    expect(newsTool.description).toBeDefined()
    expect(newsTool.description).toContain("news")
  })

  it("has inputSchema", () => {
    expect(newsTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(newsTool.inputSchema.oneOf || newsTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(newsTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleNews", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleNews({ action: "invalid_action" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleNews({})
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("headlines action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleNews({ action: "headlines" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/news/headlines", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleNews({
        action: "headlines",
        ticker: "AAPL",
        limit: 50,
        sources: "reuters,bloomberg",
        search_term: "earnings",
        major_only: true,
        page: 2,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/news/headlines", expect.objectContaining({
        ticker: "AAPL",
        limit: 50,
        sources: "reuters,bloomberg",
        search_term: "earnings",
        major_only: true,
        page: 2,
      }))
    })

    it("works with minimal parameters", async () => {
      await handleNews({ action: "headlines", ticker: "NVDA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/news/headlines", expect.objectContaining({
        ticker: "NVDA",
      }))
    })
  })
})
