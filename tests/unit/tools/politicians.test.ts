import { describe, it, expect, vi, beforeEach } from "vitest"
import { handlePoliticians, politiciansTool } from "../../../src/tools/politicians.js"

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

describe("politiciansTool", () => {
  it("has correct name", () => {
    expect(politiciansTool.name).toBe("uw_politicians")
  })

  it("has a description", () => {
    expect(politiciansTool.description).toBeDefined()
    expect(politiciansTool.description).toContain("politician")
  })

  it("has inputSchema", () => {
    expect(politiciansTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(politiciansTool.inputSchema.oneOf || politiciansTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(politiciansTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handlePoliticians", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handlePoliticians({ action_type: "invalid_action" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handlePoliticians({})
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("people action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action_type: "people" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/people")
    })
  })

  describe("portfolio action", () => {
    it("returns error when politician_id is missing", async () => {
      const result = await handlePoliticians({ action_type: "portfolio" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action_type: "portfolio", politician_id: "12345678-1234-4234-8234-123456789012" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/12345678-1234-4234-8234-123456789012", expect.any(Object))
    })

    it("passes aggregate parameter", async () => {
      await handlePoliticians({
        action_type: "portfolio",
        politician_id: "12345678-1234-4234-8234-123456789012",
        aggregate_all_portfolios: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/12345678-1234-4234-8234-123456789012", expect.objectContaining({
        aggregate_all_portfolios: true,
      }))
    })
  })

  describe("recent_trades action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action_type: "recent_trades" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/recent_trades", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handlePoliticians({
        action_type: "recent_trades",
        date: "2024-01-15",
        ticker: "AAPL",
        politician_id: "12345678-1234-4234-8234-123456789012",
        limit: 50,
        filter_late_reports: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/recent_trades", expect.objectContaining({
        date: "2024-01-15",
        ticker: "AAPL",
        politician_id: "12345678-1234-4234-8234-123456789012",
        limit: 50,
        filter_late_reports: true,
      }))
    })

    it("passes date range filters", async () => {
      await handlePoliticians({
        action_type: "recent_trades",
        disclosure_newer_than: "2024-01-01",
        disclosure_older_than: "2024-01-31",
        transaction_newer_than: "2024-01-01",
        transaction_older_than: "2024-01-31",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/recent_trades", expect.objectContaining({
        disclosure_newer_than: "2024-01-01",
        disclosure_older_than: "2024-01-31",
        transaction_newer_than: "2024-01-01",
        transaction_older_than: "2024-01-31",
      }))
    })
  })

  describe("holders action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handlePoliticians({ action_type: "holders" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action_type: "holders", ticker: "NVDA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/holders/NVDA", expect.any(Object))
    })

    it("passes aggregate parameter", async () => {
      await handlePoliticians({
        action_type: "holders",
        ticker: "TSLA",
        aggregate_all_portfolios: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/holders/TSLA", expect.objectContaining({
        aggregate_all_portfolios: true,
      }))
    })
  })

  describe("disclosures action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action_type: "disclosures" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/disclosures", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handlePoliticians({
        action_type: "disclosures",
        politician_id: "12345678-1234-4234-8234-123456789012",
        latest_only: true,
        year: 2024,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/disclosures", expect.objectContaining({
        politician_id: "12345678-1234-4234-8234-123456789012",
        latest_only: true,
        year: 2024,
      }))
    })
  })
})
