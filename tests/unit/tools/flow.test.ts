import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleFlow, flowTool } from "../../../src/tools/flow.js"

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

describe("flowTool", () => {
  it("has correct name", () => {
    expect(flowTool.name).toBe("uw_flow")
  })

  it("has a description", () => {
    expect(flowTool.description).toBeDefined()
    expect(flowTool.description).toContain("flow alerts")
  })

  it("has inputSchema", () => {
    expect(flowTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(flowTool.inputSchema.oneOf || flowTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(flowTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleFlow", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleFlow({ action: "invalid_action" })
      // Zod discriminated union returns "Invalid input" for invalid discriminator values
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleFlow({})
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("flow_alerts action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleFlow({ action: "flow_alerts" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-trades/flow-alerts", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleFlow({
        action: "flow_alerts",
        ticker_symbol: "AAPL,TSLA",
        min_premium: 10000,
        max_premium: 1000000,
        limit: 50,
        is_sweep: true,
        is_call: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-trades/flow-alerts", expect.objectContaining({
        ticker_symbol: "AAPL,TSLA",
        min_premium: 10000,
        max_premium: 1000000,
        limit: 50,
        is_sweep: true,
        is_call: true,
      }))
    })

    it("rejects negative premium", async () => {
      const result = await handleFlow({
        action: "flow_alerts",
        min_premium: -100,
      })
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("full_tape action", () => {
    it("returns error when date is missing", async () => {
      const result = await handleFlow({ action: "full_tape" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleFlow({ action: "full_tape", date: "2024-01-15" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-trades/full-tape/2024-01-15")
    })
  })

  describe("net_flow_expiry action", () => {
    it("calls uwFetch without date", async () => {
      await handleFlow({ action: "net_flow_expiry" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/net-flow/expiry", expect.objectContaining({
        date: undefined,
      }))
    })

    it("passes date and filter params", async () => {
      await handleFlow({
        action: "net_flow_expiry",
        date: "2024-01-15",
        moneyness: "all",
        tide_type: "bullish",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/net-flow/expiry", expect.objectContaining({
        date: "2024-01-15",
        moneyness: "all",
        tide_type: "bullish",
      }))
    })
  })

  describe("group_greek_flow action", () => {
    it("returns error when flow_group is missing", async () => {
      const result = await handleFlow({ action: "group_greek_flow" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleFlow({ action: "group_greek_flow", flow_group: "mag7" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/group-flow/mag7/greek-flow", { date: undefined })
    })

    it("passes date parameter", async () => {
      await handleFlow({
        action: "group_greek_flow",
        flow_group: "semi",
        date: "2024-01-15",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/group-flow/semi/greek-flow", {
        date: "2024-01-15",
      })
    })
  })

  describe("group_greek_flow_expiry action", () => {
    it("returns error when flow_group is missing", async () => {
      const result = await handleFlow({
        action: "group_greek_flow_expiry",
        expiry: "2024-01-19",
      })
      // Zod validation error for missing required field
      expect(result.text).toContain("Invalid input")
    })

    it("returns error when expiry is missing", async () => {
      const result = await handleFlow({
        action: "group_greek_flow_expiry",
        flow_group: "mag7",
      })
      // Zod validation error for missing required field
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleFlow({
        action: "group_greek_flow_expiry",
        flow_group: "mag7",
        expiry: "2024-01-19",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/group-flow/mag7/greek-flow/2024-01-19", {
        date: undefined,
      })
    })
  })

  describe("lit_flow_recent action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleFlow({ action: "lit_flow_recent" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/lit-flow/recent", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleFlow({
        action: "lit_flow_recent",
        date: "2024-01-15",
        limit: 100,
        min_premium: 10000,
        max_premium: 1000000,
        min_size: 100,
        max_size: 10000,
        min_volume: 1000,
        max_volume: 100000,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/lit-flow/recent", expect.objectContaining({
        date: "2024-01-15",
        limit: 100,
        min_premium: 10000,
        max_premium: 1000000,
        min_size: 100,
        max_size: 10000,
        min_volume: 1000,
        max_volume: 100000,
      }))
    })
  })

  describe("lit_flow_ticker action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleFlow({ action: "lit_flow_ticker" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleFlow({ action: "lit_flow_ticker", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/lit-flow/AAPL", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleFlow({
        action: "lit_flow_ticker",
        ticker: "TSLA",
        date: "2024-01-15",
        limit: 200,
        min_premium: 5000,
        max_premium: 500000,
        min_size: 50,
        max_size: 5000,
        min_volume: 500,
        max_volume: 50000,
        newer_than: "2024-01-15T10:00:00Z",
        older_than: "2024-01-15T16:00:00Z",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/lit-flow/TSLA", expect.objectContaining({
        date: "2024-01-15",
        limit: 200,
        min_premium: 5000,
        max_premium: 500000,
        min_size: 50,
        max_size: 5000,
        min_volume: 500,
        max_volume: 50000,
        newer_than: "2024-01-15T10:00:00Z",
        older_than: "2024-01-15T16:00:00Z",
      }))
    })
  })
})
