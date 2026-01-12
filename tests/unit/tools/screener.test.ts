import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleScreener, screenerTool } from "../../../src/tools/screener.js"

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

describe("screenerTool", () => {
  it("has correct name", () => {
    expect(screenerTool.name).toBe("uw_screener")
  })

  it("has a description", () => {
    expect(screenerTool.description).toBeDefined()
    expect(screenerTool.description).toContain("screeners")
  })

  it("has inputSchema", () => {
    expect(screenerTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(screenerTool.inputSchema.oneOf || screenerTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(screenerTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleScreener", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleScreener({ action_type: "invalid_action" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleScreener({})
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("stocks action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleScreener({ action_type: "stocks" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/stocks", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleScreener({
        action_type: "stocks",
        ticker: "AAPL",
        min_marketcap: 1000000000,
        max_marketcap: 5000000000,
        min_volume: 100000,
        max_volume: 10000000,
        order: "volume",
        order_direction: "desc",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/stocks", expect.objectContaining({
        ticker: "AAPL",
        min_marketcap: 1000000000,
        max_marketcap: 5000000000,
        min_volume: 100000,
        max_volume: 10000000,
        order: "volume",
        order_direction: "desc",
      }))
    })

    it("passes stock-specific filters", async () => {
      await handleScreener({
        action_type: "stocks",
        is_s_p_500: true,
        has_dividends: true,
        min_iv_rank: 0.5,
        max_iv_rank: 1.0,
        min_put_call_ratio: 0.8,
        max_put_call_ratio: 1.2,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/stocks", expect.objectContaining({
        is_s_p_500: true,
        has_dividends: true,
        min_iv_rank: 0.5,
        max_iv_rank: 1.0,
        min_put_call_ratio: 0.8,
        max_put_call_ratio: 1.2,
      }))
    })
  })

  describe("option_contracts action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleScreener({ action_type: "option_contracts" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/option-contracts", expect.any(Object))
    })

    it("passes option filter parameters", async () => {
      await handleScreener({
        action_type: "option_contracts",
        min_dte: 7,
        max_dte: 30,
        min_premium: 1000,
        max_premium: 50000,
        is_otm: true,
        type: "call",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/option-contracts", expect.objectContaining({
        min_dte: 7,
        max_dte: 30,
        min_premium: 1000,
        max_premium: 50000,
        is_otm: true,
        type: "call",
      }))
    })

    it("passes greek filters", async () => {
      await handleScreener({
        action_type: "option_contracts",
        min_delta: 0.3,
        max_delta: 0.7,
        min_gamma: 0.01,
        max_gamma: 0.1,
        min_theta: -0.5,
        max_theta: -0.1,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/option-contracts", expect.objectContaining({
        min_delta: 0.3,
        max_delta: 0.7,
        min_gamma: 0.01,
        max_gamma: 0.1,
        min_theta: -0.5,
        max_theta: -0.1,
      }))
    })

    it("passes volume and OI filters", async () => {
      await handleScreener({
        action_type: "option_contracts",
        min_volume: 1000,
        max_volume: 100000,
        min_open_interest: 500,
        max_open_interest: 50000,
        vol_greater_oi: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/option-contracts", expect.objectContaining({
        min_volume: 1000,
        max_volume: 100000,
        min_open_interest: 500,
        max_open_interest: 50000,
        vol_greater_oi: true,
      }))
    })
  })

  describe("analysts action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleScreener({ action_type: "analysts" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/analysts", expect.any(Object))
    })

    it("passes analyst filter parameters", async () => {
      await handleScreener({
        action_type: "analysts",
        ticker: "AAPL",
        recommendation: "buy",
        action: "upgraded",
        limit: 50,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/screener/analysts", expect.objectContaining({
        ticker: "AAPL",
        recommendation: "buy",
        action: "upgraded",
        limit: 50,
      }))
    })
  })
})
