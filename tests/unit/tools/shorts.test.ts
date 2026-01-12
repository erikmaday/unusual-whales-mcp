import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleShorts, shortsTool } from "../../../src/tools/shorts.js"

// Mock must be inline due to Vitest hoisting requirements
vi.mock("../../../src/client.js", () => ({
  uwFetch: vi.fn(),
  formatResponse: vi.fn((result: { error?: string; data?: unknown }) => {
    if (result.error) {
      return JSON.stringify({ error: result.error }, null, 2)
    }
    return JSON.stringify(result.data, null, 2)
  }),
  formatError: vi.fn((message: string) => JSON.stringify({ error: message })),
  encodePath: vi.fn((value: unknown) => {
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

const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

/**
 * Expected annotations for all UW tools.
 */
const EXPECTED_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: true,
}

describe("shortsTool", () => {
  it("has correct name", () => {
    expect(shortsTool.name).toBe("uw_shorts")
  })

  it("has description containing 'short'", () => {
    expect(shortsTool.description).toContain("short")
  })

  it("has object inputSchema", () => {
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(shortsTool.inputSchema.oneOf || shortsTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(shortsTool.annotations).toEqual(EXPECTED_ANNOTATIONS)
  })
})

describe("handleShorts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("rejects invalid action", async () => {
      const result = await handleShorts({ action_type: "invalid_action", ticker: "GME" })
      expect(result.text).toContain("Invalid input")
    })

    it("rejects missing action", async () => {
      const result = await handleShorts({ ticker: "GME" })
      expect(result.text).toContain("Invalid input")
    })

    it("rejects missing ticker", async () => {
      const result = await handleShorts({ action_type: "data" })
      expect(result.text).toContain("Invalid input")
    })
  })

  describe("data action", () => {
    it("calls correct endpoint", async () => {
      await handleShorts({ action_type: "data", ticker: "GME" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/shorts/GME/data")
    })

    it("handles API error response", async () => {
      mockUwFetch.mockResolvedValue({ error: "API unavailable" })
      const result = await handleShorts({ action_type: "data", ticker: "GME" })
      expect(result.text).toContain("API unavailable")
    })
  })

  describe("ftds action", () => {
    it("calls correct endpoint", async () => {
      await handleShorts({ action_type: "ftds", ticker: "AMC" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/shorts/AMC/ftds")
    })
  })

  describe("interest_float action", () => {
    it("calls correct endpoint", async () => {
      await handleShorts({ action_type: "interest_float", ticker: "TSLA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/shorts/TSLA/interest-float")
    })
  })

  describe("volume_ratio action", () => {
    it("calls correct endpoint", async () => {
      await handleShorts({ action_type: "volume_ratio", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/shorts/AAPL/volume-and-ratio")
    })
  })

  describe("volumes_by_exchange action", () => {
    it("calls correct endpoint", async () => {
      await handleShorts({ action_type: "volumes_by_exchange", ticker: "NVDA" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/shorts/NVDA/volumes-by-exchange")
    })
  })
})
