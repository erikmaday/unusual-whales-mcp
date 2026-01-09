import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleMarket, marketTool } from "../../../src/tools/market.js"

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

describe("marketTool", () => {
  it("has correct name", () => {
    expect(marketTool.name).toBe("uw_market")
  })

  it("has a description", () => {
    expect(marketTool.description).toBeDefined()
    expect(marketTool.description).toContain("market")
  })

  it("has inputSchema", () => {
    expect(marketTool.inputSchema).toBeDefined()
    expect(marketTool.inputSchema.type).toBe("object")
  })

  it("has correct annotations", () => {
    expect(marketTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleMarket", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleMarket({ action: "invalid_action" })
      expect(result).toContain("Invalid option")
    })

    it("returns error for missing action", async () => {
      const result = await handleMarket({})
      expect(result).toContain("Invalid input")
    })
  })

  describe("market_tide action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "market_tide" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/market-tide", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleMarket({
        action: "market_tide",
        date: "2024-01-15",
        otm_only: true,
        interval_5m: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/market-tide", expect.objectContaining({
        date: "2024-01-15",
        otm_only: true,
        interval_5m: true,
      }))
    })
  })

  describe("sector_tide action", () => {
    it("returns error when sector is missing", async () => {
      const result = await handleMarket({ action: "sector_tide" })
      expect(result).toContain("sector is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "sector_tide", sector: "Technology" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/Technology/sector-tide", expect.any(Object))
    })

    it("passes date parameter", async () => {
      await handleMarket({
        action: "sector_tide",
        sector: "Energy",
        date: "2024-01-15",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/Energy/sector-tide", expect.objectContaining({
        date: "2024-01-15",
      }))
    })
  })

  describe("etf_tide action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleMarket({ action: "etf_tide" })
      expect(result).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "etf_tide", ticker: "SPY" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/SPY/etf-tide", expect.any(Object))
    })

    it("passes date parameter", async () => {
      await handleMarket({
        action: "etf_tide",
        ticker: "QQQ",
        date: "2024-01-15",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/QQQ/etf-tide", expect.objectContaining({
        date: "2024-01-15",
      }))
    })
  })

  describe("sector_etfs action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "sector_etfs" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/sector-etfs")
    })
  })

  describe("economic_calendar action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "economic_calendar" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/economic-calendar")
    })
  })

  describe("fda_calendar action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "fda_calendar" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/fda-calendar", expect.any(Object))
    })

    it("passes all filter parameters", async () => {
      await handleMarket({
        action: "fda_calendar",
        announced_date_min: "2024-01-01",
        announced_date_max: "2024-12-31",
        target_date_min: "2024-06-01",
        target_date_max: "2024-06-30",
        drug: "Keytruda",
        ticker: "MRK",
        limit: 50,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/fda-calendar", expect.objectContaining({
        announced_date_min: "2024-01-01",
        announced_date_max: "2024-12-31",
        target_date_min: "2024-06-01",
        target_date_max: "2024-06-30",
        drug: "Keytruda",
        ticker: "MRK",
        limit: 50,
      }))
    })
  })

  describe("correlations action", () => {
    it("returns error when tickers is missing", async () => {
      const result = await handleMarket({ action: "correlations" })
      expect(result).toContain("tickers is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "correlations", tickers: "AAPL,MSFT,GOOGL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/correlations", expect.any(Object))
    })

    it("passes all filter parameters", async () => {
      await handleMarket({
        action: "correlations",
        tickers: "AAPL,TSLA",
        interval: "1y",
        start_date: "2023-01-01",
        end_date: "2024-01-01",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/correlations", expect.objectContaining({
        tickers: "AAPL,TSLA",
        interval: "1y",
        start_date: "2023-01-01",
        end_date: "2024-01-01",
      }))
    })
  })

  describe("insider_buy_sells action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "insider_buy_sells" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/insider-buy-sells", expect.any(Object))
    })

    it("passes limit parameter", async () => {
      await handleMarket({ action: "insider_buy_sells", limit: 100 })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/insider-buy-sells", expect.objectContaining({
        limit: 100,
      }))
    })
  })

  describe("oi_change action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "oi_change" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/oi-change", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleMarket({
        action: "oi_change",
        date: "2024-01-15",
        limit: 50,
        order: "desc",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/oi-change", expect.objectContaining({
        date: "2024-01-15",
        limit: 50,
        order: "desc",
      }))
    })
  })

  describe("spike action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "spike" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/spike", expect.any(Object))
    })

    it("passes date parameter", async () => {
      await handleMarket({ action: "spike", date: "2024-01-15" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/spike", expect.objectContaining({
        date: "2024-01-15",
      }))
    })
  })

  describe("top_net_impact action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "top_net_impact" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/top-net-impact", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleMarket({
        action: "top_net_impact",
        date: "2024-01-15",
        issue_types: "Common Stock",
        limit: 25,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/top-net-impact", expect.objectContaining({
        date: "2024-01-15",
        "issue_types[]": "Common Stock",
        limit: 25,
      }))
    })
  })

  describe("total_options_volume action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleMarket({ action: "total_options_volume" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/total-options-volume", expect.any(Object))
    })

    it("passes limit parameter", async () => {
      await handleMarket({ action: "total_options_volume", limit: 30 })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/market/total-options-volume", expect.objectContaining({
        limit: 30,
      }))
    })
  })
})
