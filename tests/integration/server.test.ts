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
      // For discriminated unions, the schema has oneOf instead of type: "object"
      expect(tool.inputSchema.oneOf || tool.inputSchema.type).toBeDefined()
      // For discriminated unions, properties are in each variant, not at the top level
      if (tool.inputSchema.oneOf) {
        expect(Array.isArray(tool.inputSchema.oneOf)).toBe(true)
        expect(tool.inputSchema.oneOf.length).toBeGreaterThan(0)
      } else {
        expect(tool.inputSchema.properties).toBeDefined()
      }
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

  it("handlers return structured responses", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "ticker_exchanges" })

    expect(typeof result).toBe("object")
    expect(result).toHaveProperty("text")
    expect(typeof result.text).toBe("string")
    expect(() => JSON.parse(result.text)).not.toThrow()
  })

  it("handlers return error for invalid input", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "invalid_action_that_does_not_exist" })

    expect(typeof result).toBe("object")
    expect(result).toHaveProperty("text")
    const parsed = JSON.parse(result.text)
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
    expect(result).toHaveProperty("text")
    expect(result).toHaveProperty("structuredContent")
    const parsed = JSON.parse(result.text)

    expect(parsed).toEqual(mockData)
    expect(result.structuredContent).toEqual(mockData)
  })

  it("API error response flows through correctly", async () => {
    mockUwFetch.mockResolvedValue({ error: "API rate limit exceeded" })

    const handler = handlers["uw_stock"]
    const result = await handler({ action: "info", ticker: "AAPL" })
    expect(result).toHaveProperty("text")
    const parsed = JSON.parse(result.text)

    expect(parsed.error).toBe("API rate limit exceeded")
  })

  it("validation errors are returned before API call", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "ohlc", ticker: "AAPL" }) // missing candle_size

    expect(result).toHaveProperty("text")
    const parsed = JSON.parse(result.text)
    expect(parsed.error).toContain("required")
    expect(mockUwFetch).not.toHaveBeenCalled()
  })
})

describe("Tool Input Schema Validation", () => {
  it("all tools have action enum in schema", () => {
    for (const tool of tools) {
      if (tool.inputSchema.oneOf) {
        // For discriminated unions, action is the discriminator field
        // Check that each variant has an action property
        for (const variant of tool.inputSchema.oneOf) {
          expect(variant.properties?.action).toBeDefined()
        }
      } else {
        // For regular schemas, action is in properties
        const actionProp = tool.inputSchema.properties.action
        expect(actionProp).toBeDefined()
      }
    }
  })

  it("action is required for all tools", () => {
    for (const tool of tools) {
      if (tool.inputSchema.oneOf) {
        // For discriminated unions, action is required in each variant
        for (const variant of tool.inputSchema.oneOf) {
          expect(variant.required).toContain("action")
        }
      } else {
        // For regular schemas, action is in required array
        expect(tool.inputSchema.required).toContain("action")
      }
    }
  })
})
