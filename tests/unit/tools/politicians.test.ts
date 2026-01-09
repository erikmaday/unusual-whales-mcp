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
    expect(politiciansTool.inputSchema.type).toBe("object")
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
      const result = await handlePoliticians({ action: "invalid_action" })
      expect(result).toContain("Invalid option")
    })

    it("returns error for missing action", async () => {
      const result = await handlePoliticians({})
      expect(result).toContain("Invalid input")
    })
  })

  describe("people action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action: "people" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/people")
    })
  })

  describe("portfolio action", () => {
    it("returns error when politician_id is missing", async () => {
      const result = await handlePoliticians({ action: "portfolio" })
      expect(result).toContain("politician_id is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action: "portfolio", politician_id: "nancy-pelosi" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/nancy-pelosi", expect.any(Object))
    })

    it("passes aggregate parameter", async () => {
      await handlePoliticians({
        action: "portfolio",
        politician_id: "nancy-pelosi",
        aggregate_all_portfolios: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/nancy-pelosi", expect.objectContaining({
        aggregate_all_portfolios: true,
      }))
    })
  })

  describe("recent_trades action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action: "recent_trades" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/recent_trades", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handlePoliticians({
        action: "recent_trades",
        date: "2024-01-15",
        ticker: "AAPL",
        politician_id: "nancy-pelosi",
        limit: 50,
        filter_late_reports: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/recent_trades", expect.objectContaining({
        date: "2024-01-15",
        ticker: "AAPL",
        politician_id: "nancy-pelosi",
        limit: 50,
        filter_late_reports: true,
      }))
    })

    it("passes date range filters", async () => {
      await handlePoliticians({
        action: "recent_trades",
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
      const result = await handlePoliticians({ action: "holders" })
      expect(result).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handlePoliticians({ action: "holders", ticker: "NVDA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/holders/NVDA", expect.any(Object))
    })

    it("passes aggregate parameter", async () => {
      await handlePoliticians({
        action: "holders",
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
      await handlePoliticians({ action: "disclosures" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/disclosures", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handlePoliticians({
        action: "disclosures",
        politician_id: "nancy-pelosi",
        latest_only: true,
        year: 2024,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/politician-portfolios/disclosures", expect.objectContaining({
        politician_id: "nancy-pelosi",
        latest_only: true,
        year: 2024,
      }))
    })
  })
})
