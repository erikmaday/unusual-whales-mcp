import { describe, it, expect, vi, beforeEach } from "vitest"
import { handleInstitutions, institutionsTool } from "../../../src/tools/institutions.js"

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

describe("institutionsTool", () => {
  it("has correct name", () => {
    expect(institutionsTool.name).toBe("uw_institutions")
  })

  it("has a description", () => {
    expect(institutionsTool.description).toBeDefined()
    expect(institutionsTool.description).toContain("institutional")
  })

  it("has inputSchema", () => {
    expect(institutionsTool.inputSchema).toBeDefined()
    // For discriminated unions, the schema has oneOf instead of type: "object"
    expect(institutionsTool.inputSchema.oneOf || institutionsTool.inputSchema.type).toBeDefined()
  })

  it("has correct annotations", () => {
    expect(institutionsTool.annotations).toEqual({
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    })
  })
})

describe("handleInstitutions", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "data" } })
  })

  describe("input validation", () => {
    it("returns error for invalid action", async () => {
      const result = await handleInstitutions({ action: "invalid_action" })
      expect(result).toContain("Invalid input")
    })

    it("returns error for missing action", async () => {
      const result = await handleInstitutions({})
      expect(result).toContain("Invalid input")
    })
  })

  describe("list action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleInstitutions({ action: "list" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institutions", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleInstitutions({
        action: "list",
        name: "Berkshire",
        min_total_value: 1000000,
        max_total_value: 100000000,
        limit: 50,
        page: 2,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institutions", expect.objectContaining({
        name: "Berkshire",
        min_total_value: 1000000,
        max_total_value: 100000000,
        limit: 50,
        page: 2,
      }))
    })
  })

  describe("holdings action", () => {
    it("returns error when name is missing", async () => {
      const result = await handleInstitutions({ action: "holdings" })
      expect(result).toContain("name is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleInstitutions({ action: "holdings", name: "Berkshire Hathaway" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institution/Berkshire%20Hathaway/holdings", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleInstitutions({
        action: "holdings",
        name: "Vanguard",
        date: "2024-01-15",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        limit: 100,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institution/Vanguard/holdings", expect.objectContaining({
        date: "2024-01-15",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        limit: 100,
      }))
    })
  })

  describe("activity action", () => {
    it("returns error when name is missing", async () => {
      const result = await handleInstitutions({ action: "activity" })
      expect(result).toContain("name is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleInstitutions({ action: "activity", name: "BlackRock" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institution/BlackRock/activity", expect.any(Object))
    })
  })

  describe("sectors action", () => {
    it("returns error when name is missing", async () => {
      const result = await handleInstitutions({ action: "sectors" })
      expect(result).toContain("name is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleInstitutions({ action: "sectors", name: "Fidelity" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institution/Fidelity/sectors", expect.any(Object))
    })
  })

  describe("ownership action", () => {
    it("returns error when ticker is missing", async () => {
      const result = await handleInstitutions({ action: "ownership" })
      expect(result).toContain("ticker is required")
    })

    it("calls uwFetch with correct endpoint", async () => {
      await handleInstitutions({ action: "ownership", ticker: "AAPL" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institution/AAPL/ownership", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleInstitutions({
        action: "ownership",
        ticker: "MSFT",
        date: "2024-01-15",
        order: "value",
        order_direction: "desc",
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institution/MSFT/ownership", expect.objectContaining({
        date: "2024-01-15",
        order: "value",
        order_direction: "desc",
      }))
    })
  })

  describe("latest_filings action", () => {
    it("calls uwFetch with correct endpoint", async () => {
      await handleInstitutions({ action: "latest_filings" })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institutions/latest_filings", expect.any(Object))
    })

    it("passes filter parameters", async () => {
      await handleInstitutions({
        action: "latest_filings",
        name: "Citadel",
        date: "2024-01-15",
        limit: 25,
      })
      expect(mockUwFetch).toHaveBeenCalledWith("/api/institutions/latest_filings", expect.objectContaining({
        name: "Citadel",
        date: "2024-01-15",
        limit: 25,
      }))
    })
  })
})
