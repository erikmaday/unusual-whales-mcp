import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleAlerts, alertsTool } from "../../../src/tools/alerts.js"

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

describe("alertsTool", () => {
  it("has correct name", () => {
    expect(alertsTool.name).toBe("uw_alerts")
  })

  it("has a description", () => {
    expect(alertsTool.description).toBeDefined()
    expect(alertsTool.description).toContain("alerts")
  })

  it("has inputSchema", () => {
    expect(alertsTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(alertsTool.inputSchema.oneOf || alertsTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(alertsTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleAlerts", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleAlerts({ action: "invalid_action" })
      expect(result).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleAlerts({})
      expect(result).toContain("Invalid input")
    })
  })

  describe("alerts action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleAlerts({ action: "alerts" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/alerts", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleAlerts({
        action: "alerts",
        limit: 50,
        ticker_symbols: "AAPL,TSLA",
        intraday_only: true,
        config_ids: "config1,config2",
        noti_types: "email,push",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/alerts", expect.objectContaining({
        limit: 50,
        ticker_symbols: "AAPL,TSLA",
        intraday_only: true,
        "config_ids[]": "config1,config2",
        "noti_types[]": "email,push",
      }))
    })

    it("passes timestamp filters", async () => {
      await handleAlerts({
        action: "alerts",
        newer_than: "2024-01-01T00:00:00Z",
        older_than: "2024-01-31T23:59:59Z",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/alerts", expect.objectContaining({
        newer_than: "2024-01-01T00:00:00Z",
        older_than: "2024-01-31T23:59:59Z",
      }))
    })
  })

  describe("configurations action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleAlerts({ action: "configurations" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/alerts/configuration")
    })
  })
})
