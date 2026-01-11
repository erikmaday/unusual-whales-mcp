import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleEtf, etfTool } from "../../../src/tools/etf.js"

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

describe("etfTool", () => {
  it("has correct name", () => {
    expect(etfTool.name).toBe("uw_etf")
  })

  it("has a description", () => {
    expect(etfTool.description).toBeDefined()
    expect(etfTool.description).toContain("ETF")
  })

  it("has inputSchema", () => {
    expect(etfTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(etfTool.inputSchema.oneOf || etfTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(etfTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleEtf", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleEtf({ action: "invalid_action", ticker: "SPY" })
      expect(result).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleEtf({ ticker: "SPY" })
      expect(result).toContain("Invalid input")
    })

    it("returns error for missing ticker", async () => {
      const result = await handleEtf({ action: "info" })
      expect(result).toContain("Invalid input")
    })
  })

  describe("info action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleEtf({ action: "info", ticker: "SPY" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/etfs/SPY/info")
    })
  })

  describe("holdings action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleEtf({ action: "holdings", ticker: "QQQ" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/etfs/QQQ/holdings")
    })
  })

  describe("exposure action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleEtf({ action: "exposure", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/etfs/AAPL/exposure")
    })
  })

  describe("in_outflow action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleEtf({ action: "in_outflow", ticker: "SPY" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/etfs/SPY/in-outflow")
    })
  })

  describe("weights action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleEtf({ action: "weights", ticker: "IWM" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/etfs/IWM/weights")
    })
  })
})
