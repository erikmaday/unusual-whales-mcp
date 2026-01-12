import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleSeasonality, seasonalityTool } from "../../../src/tools/seasonality.js"

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

describe("seasonalityTool", () => {
  it("has correct name", () => {
    expect(seasonalityTool.name).toBe("uw_seasonality")
  })

  it("has a description", () => {
    expect(seasonalityTool.description).toBeDefined()
    expect(seasonalityTool.description).toContain("seasonality")
  })

  it("has inputSchema", () => {
    expect(seasonalityTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(seasonalityTool.inputSchema.oneOf || seasonalityTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(seasonalityTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleSeasonality", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleSeasonality({ action: "invalid_action" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleSeasonality({})
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for month out of range", async () => {
      const result = await handleSeasonality({ action: "performers", month: 13 })
      expect(result.text).toContain("Too big")
    })

    it("returns error for month less than 1", async () => {
      const result = await handleSeasonality({ action: "performers", month: 0 })
      expect(result.text).toContain("Too small")
    })
  })

  describe("market action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleSeasonality({ action: "market" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/seasonality/market")
    })
  })

  describe("performers action", () => {
    it("returns error when month is missing", async () => {
      const result = await handleSeasonality({ action: "performers" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleSeasonality({ action: "performers", month: 1 })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/seasonality/1/performers", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleSeasonality({
        action: "performers",
        month: 6,
        min_years: 5,
        ticker_for_sector: "AAPL",
        s_p_500_nasdaq_only: true,
        min_oi: 1000,
        limit: 50,
        order: "avg_change",
        order_direction: "desc",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/seasonality/6/performers", expect.objectContaining({
        min_years: 5,
        ticker_for_sector: "AAPL",
        s_p_500_nasdaq_only: true,
        min_oi: 1000,
        limit: 50,
        order: "avg_change",
        order_direction: "desc",
      }))
    })
  })

  describe("monthly action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleSeasonality({ action: "monthly" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleSeasonality({ action: "monthly", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/seasonality/AAPL/monthly")
    })
  })

  describe("year_month action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleSeasonality({ action: "year_month" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleSeasonality({ action: "year_month", ticker: "MSFT" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/seasonality/MSFT/year-month")
    })
  })
})
