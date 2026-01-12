import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleOptions, optionsTool } from "../../../src/tools/options.js"

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

describe("optionsTool", () => {
  it("has correct name", () => {
    expect(optionsTool.name).toBe("uw_options")
  })

  it("has a description", () => {
    expect(optionsTool.description).toBeDefined()
    expect(optionsTool.description).toContain("option contract")
  })

  it("has inputSchema", () => {
    expect(optionsTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(optionsTool.inputSchema.oneOf || optionsTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(optionsTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleOptions", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleOptions({ action_type: "invalid_action", id: "AAPL240119C00150000" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleOptions({ id: "AAPL240119C00150000" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for missing id", async () => {
      const result = await handleOptions({ action_type: "flow" })
      expect(result.text).toContain("Invalid input")
    })

    it("returns error for negative premium", async () => {
      const result = await handleOptions({
        action_type: "flow",
        id: "AAPL240119C00150000",
        min_premium: -100,
      })
      expect(result.text).toContain("Too small")
    })
  })

  describe("flow action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleOptions({ action_type: "flow", id: "AAPL240119C00150000" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/AAPL240119C00150000/flow", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleOptions({
        action_type: "flow",
        id: "TSLA240119P00200000",
        side: "ASK",
        min_premium: 1000,
        limit: 50,
        date: "2024-01-15",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/TSLA240119P00200000/flow", expect.objectContaining({
        side: "ASK",
        min_premium: 1000,
        limit: 50,
        date: "2024-01-15",
      }))
    })
  })

  describe("historic action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleOptions({ action_type: "historic", id: "NVDA240119C00500000" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/NVDA240119C00500000/historic", expect.any(Object))
    })

    it("passes limit parameter", async () => {
      await handleOptions({
        action_type: "historic",
        id: "NVDA240119C00500000",
        limit: 100,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/NVDA240119C00500000/historic", expect.objectContaining({
        limit: 100,
      }))
    })
  })

  describe("intraday action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleOptions({ action_type: "intraday", id: "MSFT240119C00400000" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/MSFT240119C00400000/intraday", expect.any(Object))
    })

    it("passes date parameter", async () => {
      await handleOptions({
        action_type: "intraday",
        id: "MSFT240119C00400000",
        date: "2024-01-15",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/MSFT240119C00400000/intraday", expect.objectContaining({
        date: "2024-01-15",
      }))
    })
  })

  describe("volume_profile action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleOptions({ action_type: "volume_profile", id: "AMD240119C00180000" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/AMD240119C00180000/volume-profile", expect.any(Object))
    })

    it("passes date parameter", async () => {
      await handleOptions({
        action_type: "volume_profile",
        id: "AMD240119C00180000",
        date: "2024-01-15",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/option-contract/AMD240119C00180000/volume-profile", expect.objectContaining({
        date: "2024-01-15",
      }))
    })
  })
})
