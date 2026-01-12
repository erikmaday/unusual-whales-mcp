import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleCongress, congressTool } from "../../../src/tools/congress.js"

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

describe("congressTool", () => {
  it("has correct name", () => {
    expect(congressTool.name).toBe("uw_congress")
  })

  it("has a description", () => {
    expect(congressTool.description).toBeDefined()
    expect(congressTool.description).toContain("congress")
  })

  it("has inputSchema", () => {
    expect(congressTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(congressTool.inputSchema.oneOf || congressTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(congressTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleCongress", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleCongress({ action_type: "invalid_action" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleCongress({})
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("recent_trades action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleCongress({ action_type: "recent_trades" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/congress/recent-trades", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleCongress({
        action_type: "recent_trades",
        date: "2024-01-15",
        ticker: "AAPL",
        limit: 100,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/congress/recent-trades", expect.objectContaining({
        date: "2024-01-15",
        ticker: "AAPL",
        limit: 100,
      }))
    })
  })

  describe("late_reports action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleCongress({ action_type: "late_reports" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/congress/late-reports", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleCongress({
        action_type: "late_reports",
        date: "2024-01-15",
        ticker: "NVDA",
        limit: 50,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/congress/late-reports", expect.objectContaining({
        date: "2024-01-15",
        ticker: "NVDA",
        limit: 50,
      }))
    })
  })

  describe("congress_trader action", () => {
    it("uses default name when name is not provided", async () => {
      await handleCongress({ action_type: "congress_trader" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/congress/congress-trader", expect.objectContaining({
        name: "Nancy Pelosi",
      }))
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleCongress({ action_type: "congress_trader", name: "Nancy Pelosi" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/congress/congress-trader", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleCongress({
        action_type: "congress_trader",
        name: "Nancy Pelosi",
        date: "2024-01-15",
        ticker: "AAPL",
        limit: 25,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/congress/congress-trader", expect.objectContaining({
        name: "Nancy Pelosi",
        date: "2024-01-15",
        ticker: "AAPL",
        limit: 25,
      }))
    })
  })
})
