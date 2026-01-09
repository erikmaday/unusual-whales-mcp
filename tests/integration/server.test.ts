import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { tools, handlers } from "../../src/tools/index.js"

// Mock the client module for all handler tests
vi.mock("../../src/client.js", () => ({
  uwFetch: vi.fn().mockResolvedValue({ data: { mocked: true } }),
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

import { uwFetch } from "../../src/client.js"

describe("Tool Registry", () => {
  it("exports all 16 tools", () => {
    expect(tools).toHaveLength(16)
  })

  it("all tools have required properties", () => {
    for (const tool of tools) {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe("string")
      expect(tool.name.startsWith("uw_")).toBe(true)

      expect(tool.description).toBeDefined()
      expect(typeof tool.description).toBe("string")
      expect(tool.description.length).toBeGreaterThan(0)

      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe("object")
      expect(tool.inputSchema.properties).toBeDefined()
    }
  })

  it("all tools have a corresponding handler", () => {
    for (const tool of tools) {
      expect(handlers[tool.name]).toBeDefined()
      expect(typeof handlers[tool.name]).toBe("function")
    }
  })

  it("has no extra handlers without tools", () => {
    const toolNames = tools.map((t) => t.name)
    const handlerNames = Object.keys(handlers)

    expect(handlerNames.length).toBe(toolNames.length)
    for (const name of handlerNames) {
      expect(toolNames).toContain(name)
    }
  })
})

describe("Tool Names", () => {
  const expectedTools = [
    "uw_stock",
    "uw_options",
    "uw_market",
    "uw_flow",
    "uw_darkpool",
    "uw_congress",
    "uw_insider",
    "uw_institutions",
    "uw_earnings",
    "uw_etf",
    "uw_screener",
    "uw_shorts",
    "uw_seasonality",
    "uw_news",
    "uw_alerts",
    "uw_politicians",
  ]

  it("contains all expected tools", () => {
    const toolNames = tools.map((t) => t.name)
    for (const expected of expectedTools) {
      expect(toolNames).toContain(expected)
    }
  })
})

describe("Tool Annotations", () => {
  it("all tools have readOnlyHint annotation", () => {
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true)
    }
  })

  it("all tools have idempotentHint annotation", () => {
    for (const tool of tools) {
      expect(tool.annotations?.idempotentHint).toBe(true)
    }
  })
})

describe("Handler Integration", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUwFetch.mockResolvedValue({ data: { test: "response" } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("handlers return JSON strings", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "ticker_exchanges" })

    expect(typeof result).toBe("string")
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it("handlers return error JSON for invalid input", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "invalid_action_that_does_not_exist" })

    expect(typeof result).toBe("string")
    const parsed = JSON.parse(result)
    expect(parsed.error).toBeDefined()
  })

  it("handlers make API calls via uwFetch", async () => {
    const handler = handlers["uw_stock"]
    await handler({ action: "info", ticker: "AAPL" })

    expect(mockUwFetch).toHaveBeenCalled()
  })

  it("multiple handlers can be called sequentially", async () => {
    await handlers["uw_stock"]({ action: "ticker_exchanges" })
    await handlers["uw_flow"]({ action: "flow_alerts" })
    await handlers["uw_market"]({ action: "market_tide" })

    expect(mockUwFetch).toHaveBeenCalledTimes(3)
  })
})

describe("Request/Response Cycle", () => {
  const mockUwFetch = uwFetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("successful API response flows through correctly", async () => {
    const mockData = { ticker: "AAPL", price: 175.50, volume: 1000000 }
    mockUwFetch.mockResolvedValue({ data: mockData })

    const handler = handlers["uw_stock"]
    const result = await handler({ action: "info", ticker: "AAPL" })
    const parsed = JSON.parse(result)

    expect(parsed).toEqual(mockData)
  })

  it("API error response flows through correctly", async () => {
    mockUwFetch.mockResolvedValue({ error: "API rate limit exceeded" })

    const handler = handlers["uw_stock"]
    const result = await handler({ action: "info", ticker: "AAPL" })
    const parsed = JSON.parse(result)

    expect(parsed.error).toBe("API rate limit exceeded")
  })

  it("validation errors are returned before API call", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "ohlc", ticker: "AAPL" }) // missing candle_size

    const parsed = JSON.parse(result)
    expect(parsed.error).toContain("required")
    expect(mockUwFetch).not.toHaveBeenCalled()
  })
})

describe("Tool Input Schema Validation", () => {
  it("all tools have action enum in schema", () => {
    for (const tool of tools) {
      const actionProp = tool.inputSchema.properties.action
      expect(actionProp).toBeDefined()
    }
  })

  it("action is required for all tools", () => {
    for (const tool of tools) {
      expect(tool.inputSchema.required).toContain("action")
    }
  })
})
