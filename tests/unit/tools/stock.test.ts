import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleStock, stockTool } from "../../../src/tools/stock.js"

// Mock the client module
vi.mock("../../../src/client.js", () => ({
  uwFetch: vi.fn(),
  formatResponse: vi.fn((result) => {
    if (result.error) {
      return JSON.stringify({ error: result.error }, null, 2)
    }
    return JSON.stringify(result.data, null, 2)
  }),
  formatStructuredResponse: vi.fn((result) => {
    if (result.error) {
      return {
        text: JSON.stringify({ error: result.error }, null, 2),
      }
    }
    return {
      text: JSON.stringify(result.data, null, 2),
      structuredContent: result.data,
    }
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

describe("stockTool", () => {
  it("has correct name", () => {
    expect(stockTool.name).toBe("uw_stock")
  })

  it("has a description", () => {
    expect(stockTool.description).toBeDefined()
    expect(stockTool.description.length).toBeGreaterThan(0)
  })

  it("has inputSchema", () => {
    expect(stockTool.inputSchema).toBeDefined()
    expect(stockTool.inputSchema.type).toBe("object")
  })

  it("has correct annotations", () => {
    expect(stockTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleStock", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleStock({ action: "invalid_action" })
      expect(result).toHaveProperty("text")
      expect(result.text).toContain("Invalid option")
    })

    it("returns error for missing action", async () => {
      const result = await handleStock({})
      expect(result).toHaveProperty("text")
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for invalid ticker format", async () => {
      const result = await handleStock({
        action: "info",
        ticker: "TOOLONGTICKER123",
      })
      expect(result.text).toContain("Ticker symbol too long")
    })

    it("returns error for invalid date format", async () => {
      const result = await handleStock({
        action: "greeks",
        ticker: "AAPL",
        date: "invalid-date",
      })
      expect(result.text).toContain("Invalid")
    })
  })

  describe("info action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "info" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "info", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/info")
    })
  })

  describe("ohlc action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "ohlc", candle_size: "1d" })
      expect(result.text).toContain("ticker and candle_size are required")
    })

    it("returns error when candle_size is missing", async () => {
      const result = await handleStock({ action: "ohlc", ticker: "AAPL" })
      expect(result.text).toContain("ticker and candle_size are required")
    })

    it("calls uwFetch with correct endpoint and params", async () => {
      await handleStock({
        action: "ohlc",
        ticker: "AAPL",
        candle_size: "1d",
        date: "2024-01-01",
        limit: 10,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/ohlc/1d", {
        date: "2024-01-01",
        timeframe: undefined,
        end_date: undefined,
        limit: 10,
      })
    })
  })

  describe("option_chains action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "option_chains" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "option_chains", ticker: "AAPL", date: "2024-01-01" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/option-chains", {
        date: "2024-01-01",
      })
    })
  })

  describe("greeks action", () => {
    it("calls uwFetch with date and expiry params", async () => {
      await handleStock({
        action: "greeks",
        ticker: "AAPL",
        date: "2024-01-01",
        expiry: "2024-01-19",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/greeks", {
        date: "2024-01-01",
        expiry: "2024-01-19",
      })
    })
  })

  describe("greek_exposure action", () => {
    it("calls uwFetch with correct params", async () => {
      await handleStock({
        action: "greek_exposure",
        ticker: "AAPL",
        date: "2024-01-01",
        timeframe: "1y",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/greek-exposure", {
        date: "2024-01-01",
        timeframe: "1y",
      })
    })
  })

  describe("iv_rank action", () => {
    it("calls uwFetch with timespan", async () => {
      await handleStock({
        action: "iv_rank",
        ticker: "AAPL",
        timespan: "1y",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/iv-rank", {
        date: undefined,
        timespan: "1y",
      })
    })
  })

  describe("greek_flow_by_expiry action", () => {
    it("returns error when expiry is missing", async () => {
      const result = await handleStock({
        action: "greek_flow_by_expiry",
        ticker: "AAPL",
      })
      expect(result.text).toContain("ticker and expiry are required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({
        action: "greek_flow_by_expiry",
        ticker: "AAPL",
        expiry: "2024-01-19",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/greek-flow/2024-01-19", {
        date: undefined,
      })
    })
  })

  describe("atm_chains action", () => {
    it("returns error when expirations is missing", async () => {
      const result = await handleStock({
        action: "atm_chains",
        ticker: "AAPL",
      })
      expect(result.text).toContain("expirations[] is required")
    })

    it("returns error when expirations is empty", async () => {
      const result = await handleStock({
        action: "atm_chains",
        ticker: "AAPL",
        expirations: [],
      })
      expect(result.text).toContain("expirations[] is required")
    })

    it("calls uwFetch with expirations array", async () => {
      await handleStock({
        action: "atm_chains",
        ticker: "AAPL",
        expirations: ["2024-01-19", "2024-01-26"],
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/atm-chains", {
        "expirations[]": ["2024-01-19", "2024-01-26"],
      })
    })
  })

  describe("historical_risk_reversal_skew action", () => {
    it("returns error when required params are missing", async () => {
      const result = await handleStock({
        action: "historical_risk_reversal_skew",
        ticker: "AAPL",
      })
      expect(result.text).toContain("ticker, expiry, and delta are required")
    })

    it("calls uwFetch with all params", async () => {
      await handleStock({
        action: "historical_risk_reversal_skew",
        ticker: "AAPL",
        expiry: "2024-01-19",
        delta: "25",
        date: "2024-01-01",
        timeframe: "1y",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/historical-risk-reversal-skew", {
        expiry: "2024-01-19",
        delta: "25",
        date: "2024-01-01",
        timeframe: "1y",
      })
    })
  })

  describe("tickers_by_sector action", () => {
    it("returns error when sector is missing", async () => {
      const result = await handleStock({ action: "tickers_by_sector" })
      expect(result.text).toContain("sector is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "tickers_by_sector", sector: "Technology" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/Technology/tickers")
    })
  })

  describe("ticker_exchanges action", () => {
    it("calls uwFetch without params", async () => {
      await handleStock({ action: "ticker_exchanges" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock-directory/ticker-exchanges")
    })
  })

  describe("flow_alerts action", () => {
    it("calls uwFetch with filter params", async () => {
      await handleStock({
        action: "flow_alerts",
        ticker: "AAPL",
        limit: 50,
        is_ask_side: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/flow-alerts", {
        limit: 50,
        is_ask_side: true,
        is_bid_side: undefined,
      })
    })
  })

  describe("option_contracts action", () => {
    it("passes filter options correctly", async () => {
      await handleStock({
        action: "option_contracts",
        ticker: "AAPL",
        expiry: "2024-01-19",
        option_type: "call",
        vol_greater_oi: true,
        exclude_zero_vol_chains: true,
        limit: 100,
        page: 1,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/option-contracts", {
        expiry: "2024-01-19",
        option_type: "call",
        vol_greater_oi: true,
        exclude_zero_vol_chains: true,
        exclude_zero_dte: undefined,
        exclude_zero_oi_chains: undefined,
        maybe_otm_only: undefined,
        option_symbol: undefined,
        limit: 100,
        page: 1,
      })
    })
  })

  describe("spot_exposures_by_expiry_strike action", () => {
    it("returns error when expirations is missing", async () => {
      const result = await handleStock({
        action: "spot_exposures_by_expiry_strike",
        ticker: "AAPL",
      })
      expect(result.text).toContain("ticker and expirations are required")
    })

    it("passes all filter params", async () => {
      await handleStock({
        action: "spot_exposures_by_expiry_strike",
        ticker: "AAPL",
        expirations: ["2024-01-19"],
        date: "2024-01-01",
        limit: 100,
        page: 1,
        min_strike: 100,
        max_strike: 200,
        min_dte: 7,
        max_dte: 30,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/spot-exposures/expiry-strike", {
        "expirations[]": ["2024-01-19"],
        date: "2024-01-01",
        limit: 100,
        page: 1,
        min_strike: 100,
        max_strike: 200,
        min_dte: 7,
        max_dte: 30,
      })
    })
  })

  describe("stock_price_levels action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "stock_price_levels" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "stock_price_levels", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/option/stock-price-levels", { date: undefined })
    })

    it("passes date parameter", async () => {
      await handleStock({ action: "stock_price_levels", ticker: "AAPL", date: "2024-01-15" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/option/stock-price-levels", { date: "2024-01-15" })
    })
  })

  describe("stock_volume_price_levels action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "stock_volume_price_levels" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "stock_volume_price_levels", ticker: "TSLA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/TSLA/stock-volume-price-levels", { date: undefined })
    })
  })

  describe("spot_exposures action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "spot_exposures" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "spot_exposures", ticker: "NVDA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/NVDA/spot-exposures", { date: undefined })
    })
  })

  describe("spot_exposures_by_strike action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "spot_exposures_by_strike" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "spot_exposures_by_strike", ticker: "AMD" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AMD/spot-exposures/strike", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleStock({
        action: "spot_exposures_by_strike",
        ticker: "AMD",
        date: "2024-01-15",
        min_strike: 100,
        max_strike: 200,
        limit: 50,
        page: 1,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AMD/spot-exposures/strike", expect.objectContaining({
        date: "2024-01-15",
        min_strike: 100,
        max_strike: 200,
        limit: 50,
        page: 1,
      }))
    })
  })

  describe("spot_exposures_expiry_strike action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "spot_exposures_expiry_strike", expiry: "2024-01-19" })
      expect(result.text).toContain("ticker and expiry are required")
    })

    it("returns error when expiry is missing", async () => {
      const result = await handleStock({ action: "spot_exposures_expiry_strike", ticker: "AAPL" })
      expect(result.text).toContain("ticker and expiry are required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "spot_exposures_expiry_strike", ticker: "AAPL", expiry: "2024-01-19" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/spot-exposures/2024-01-19/strike", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleStock({
        action: "spot_exposures_expiry_strike",
        ticker: "AAPL",
        expiry: "2024-01-19",
        date: "2024-01-15",
        min_strike: 150,
        max_strike: 200,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/spot-exposures/2024-01-19/strike", expect.objectContaining({
        date: "2024-01-15",
        min_strike: 150,
        max_strike: 200,
      }))
    })
  })

  describe("volatility_realized action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "volatility_realized" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "volatility_realized", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/volatility/realized", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleStock({
        action: "volatility_realized",
        ticker: "AAPL",
        date: "2024-01-15",
        timeframe: "1y",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/volatility/realized", expect.objectContaining({
        date: "2024-01-15",
        timeframe: "1y",
      }))
    })
  })

  describe("volatility_stats action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "volatility_stats" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "volatility_stats", ticker: "MSFT" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/MSFT/volatility/stats", { date: undefined })
    })
  })

  describe("volatility_term_structure action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "volatility_term_structure" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "volatility_term_structure", ticker: "GOOGL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/GOOGL/volatility/term-structure", { date: undefined })
    })
  })

  describe("stock_state action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "stock_state" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "stock_state", ticker: "META" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/META/stock-state")
    })
  })

  describe("insider_buy_sells action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "insider_buy_sells" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "insider_buy_sells", ticker: "AMZN" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AMZN/insider-buy-sells")
    })
  })

  describe("ownership action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "ownership" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "ownership", ticker: "NFLX" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/NFLX/ownership", { limit: undefined })
    })

    it("passes limit parameter", async () => {
      await handleStock({ action: "ownership", ticker: "NFLX", limit: 50 })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/NFLX/ownership", { limit: 50 })
    })
  })

  describe("greek_exposure_by_expiry action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "greek_exposure_by_expiry" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "greek_exposure_by_expiry", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/greek-exposure/expiry", { date: undefined })
    })
  })

  describe("greek_exposure_by_strike action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "greek_exposure_by_strike" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "greek_exposure_by_strike", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/greek-exposure/strike", { date: undefined })
    })
  })

  describe("greek_exposure_by_strike_expiry action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "greek_exposure_by_strike_expiry" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "greek_exposure_by_strike_expiry", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/greek-exposure/strike-expiry", expect.any(Object))
    })
  })

  describe("greek_flow action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "greek_flow" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "greek_flow", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/greek-flow", { date: undefined })
    })
  })

  describe("interpolated_iv action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "interpolated_iv" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "interpolated_iv", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/interpolated-iv", { date: undefined })
    })
  })

  describe("max_pain action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "max_pain" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "max_pain", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/max-pain", { date: undefined })
    })
  })

  describe("oi_change action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "oi_change" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "oi_change", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/oi-change", expect.any(Object))
    })
  })

  describe("oi_per_expiry action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "oi_per_expiry" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "oi_per_expiry", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/oi-per-expiry", { date: undefined })
    })
  })

  describe("oi_per_strike action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "oi_per_strike" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "oi_per_strike", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/oi-per-strike", { date: undefined })
    })
  })

  describe("options_volume action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "options_volume" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "options_volume", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/options-volume", { limit: undefined })
    })
  })

  describe("volume_oi_expiry action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "volume_oi_expiry" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "volume_oi_expiry", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/option/volume-oi-expiry", { date: undefined })
    })
  })

  describe("expiry_breakdown action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "expiry_breakdown" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "expiry_breakdown", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/expiry-breakdown", { date: undefined })
    })
  })

  describe("flow_per_expiry action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "flow_per_expiry" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "flow_per_expiry", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/flow-per-expiry")
    })
  })

  describe("flow_per_strike action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "flow_per_strike" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "flow_per_strike", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/flow-per-strike", { date: undefined })
    })
  })

  describe("flow_per_strike_intraday action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "flow_per_strike_intraday" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "flow_per_strike_intraday", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/flow-per-strike-intraday", expect.any(Object))
    })
  })

  describe("flow_recent action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "flow_recent" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "flow_recent", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/flow-recent", expect.any(Object))
    })
  })

  describe("net_prem_ticks action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "net_prem_ticks" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "net_prem_ticks", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/net-prem-ticks", { date: undefined })
    })
  })

  describe("nope action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "nope" })
      expect(result.text).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleStock({ action: "nope", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/stock/AAPL/nope", { date: undefined })
    })
  })

  describe("greeks action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleStock({ action: "greeks" })
      expect(result.text).toContain("ticker is required")
    })
  })
})
