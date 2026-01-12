import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleInsider, insiderTool } from "../../../src/tools/insider.js"

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

describe("insiderTool", () => {
  it("has correct name", () => {
    expect(insiderTool.name).toBe("uw_insider")
  })

  it("has a description", () => {
    expect(insiderTool.description).toBeDefined()
    expect(insiderTool.description).toContain("insider")
  })

  it("has inputSchema", () => {
    expect(insiderTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(insiderTool.inputSchema.oneOf || insiderTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(insiderTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleInsider", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleInsider({ action: "invalid_action" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleInsider({})
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("transactions action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleInsider({ action: "transactions" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/insider/transactions", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleInsider({
        action: "transactions",
        ticker_symbol: "AAPL,TSLA",
        min_value: 100000,
        max_value: 10000000,
        is_officer: true,
        is_director: true,
        limit: 50,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/insider/transactions", expect.objectContaining({
        ticker_symbol: "AAPL,TSLA",
        min_value: 100000,
        max_value: 10000000,
        is_officer: true,
        is_director: true,
        limit: 50,
      }))
    })

    it("passes transaction codes", async () => {
      await handleInsider({
        action: "transactions",
        transaction_codes: "P,S",
        is_s_p_500: true,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/insider/transactions", expect.objectContaining({
        "transaction_codes[]": "P,S",
        is_s_p_500: true,
      }))
    })
  })

  describe("sector_flow action", () => {
    it("returns error when sector is missing", async () => {
      const result = await handleInsider({ action: "sector_flow" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleInsider({ action: "sector_flow", sector: "Technology" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/insider/Technology/sector-flow")
    })
  })

  describe("ticker_flow action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleInsider({ action: "ticker_flow" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleInsider({ action: "ticker_flow", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/insider/AAPL/ticker-flow")
    })
  })

  describe("insiders action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleInsider({ action: "insiders" })
      expect(result.text).toContain("Invalid input")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleInsider({ action: "insiders", ticker: "NVDA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/insider/NVDA")
    })
  })
})
