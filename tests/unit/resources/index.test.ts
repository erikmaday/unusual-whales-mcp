import { describe, it, expect } from "vitest"
import {
  generateApiReference,
  generateToolsSummary,
  initializeResources,
} from "../../../src/resources/index.js"
import type { ToolDefinition } from "../../../src/tools/index.js"

describe("generateApiReference", () => {
  it("generates markdown documentation for tools", () => {
    const tools: ToolDefinition[] = [
      {
        name: "test_tool",
        description: "A test tool\nWith multiple lines",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string" },
          },
          required: ["action"],
        },
        annotations: {
          readOnlyHint: true,
          idempotentHint: true,
        },
      },
    ]

    const result = generateApiReference(tools)

    expect(result).toContain("# Unusual Whales API Reference")
    expect(result).toContain("## test_tool")
    expect(result).toContain("A test tool")
    expect(result).toContain("### Input Schema")
    expect(result).toContain("### Annotations")
    expect(result).toContain("- Read-only operation")
    expect(result).toContain("- Idempotent operation")
  })

  it("handles tools without annotations", () => {
    const tools: ToolDefinition[] = [
      {
        name: "simple_tool",
        description: "Simple tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ]

    const result = generateApiReference(tools)

    expect(result).toContain("## simple_tool")
    expect(result).not.toContain("### Annotations")
  })

  it("generates table of contents", () => {
    const tools: ToolDefinition[] = [
      {
        name: "tool_one",
        description: "First tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "tool_two",
        description: "Second tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ]

    const result = generateApiReference(tools)

    expect(result).toContain("## Available Tools")
    expect(result).toContain("1. [tool_one](#toolone)")
    expect(result).toContain("2. [tool_two](#tooltwo)")
  })
})

describe("generateToolsSummary", () => {
  it("generates JSON summary of tools", () => {
    const tools: ToolDefinition[] = [
      {
        name: "test_tool",
        description: "A test tool\nWith multiple lines",
        inputSchema: {
          type: "object",
          properties: {
            action: { type: "string" },
          },
          required: ["action"],
        },
        annotations: {
          readOnlyHint: true,
        },
      },
    ]

    const result = generateToolsSummary(tools)
    const parsed = JSON.parse(result)

    expect(parsed.totalTools).toBe(1)
    expect(parsed.tools).toHaveLength(1)
    expect(parsed.tools[0].name).toBe("test_tool")
    expect(parsed.tools[0].description).toBe("A test tool")
    expect(parsed.tools[0].requiredParameters).toEqual(["action"])
    expect(parsed.tools[0].annotations).toEqual({ readOnlyHint: true })
  })

  it("handles multiple tools", () => {
    const tools: ToolDefinition[] = [
      {
        name: "tool_one",
        description: "First tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "tool_two",
        description: "Second tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: ["param"],
        },
      },
    ]

    const result = generateToolsSummary(tools)
    const parsed = JSON.parse(result)

    expect(parsed.totalTools).toBe(2)
    expect(parsed.tools).toHaveLength(2)
    expect(parsed.tools[0].name).toBe("tool_one")
    expect(parsed.tools[1].name).toBe("tool_two")
    expect(parsed.tools[1].requiredParameters).toEqual(["param"])
  })

  it("uses only first line of description", () => {
    const tools: ToolDefinition[] = [
      {
        name: "test_tool",
        description: "First line\nSecond line\nThird line",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ]

    const result = generateToolsSummary(tools)
    const parsed = JSON.parse(result)

    expect(parsed.tools[0].description).toBe("First line")
  })
})

describe("initializeResources", () => {
  it("creates resource definitions and handlers", () => {
    const tools: ToolDefinition[] = [
      {
        name: "test_tool",
        description: "A test tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ]

    const { resources, handlers } = initializeResources(tools)

    expect(resources).toHaveLength(2)
    expect(Object.keys(handlers)).toHaveLength(2)
  })

  it("creates API reference resource", () => {
    const tools: ToolDefinition[] = []
    const { resources, handlers } = initializeResources(tools)

    const apiRefResource = resources.find((r) => r.uri === "docs://api-reference")
    expect(apiRefResource).toBeDefined()
    expect(apiRefResource?.name).toBe("API Reference")
    expect(apiRefResource?.mimeType).toBe("text/markdown")
    expect(handlers["docs://api-reference"]).toBeDefined()
  })

  it("creates tools summary resource", () => {
    const tools: ToolDefinition[] = []
    const { resources, handlers } = initializeResources(tools)

    const summaryResource = resources.find((r) => r.uri === "docs://tools-summary")
    expect(summaryResource).toBeDefined()
    expect(summaryResource?.name).toBe("Tools Summary")
    expect(summaryResource?.mimeType).toBe("application/json")
    expect(handlers["docs://tools-summary"]).toBeDefined()
  })

  it("handlers return correct content", async () => {
    const tools: ToolDefinition[] = [
      {
        name: "test_tool",
        description: "A test tool",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ]

    const { handlers } = initializeResources(tools)

    const apiRefContent = await handlers["docs://api-reference"]()
    expect(apiRefContent).toContain("# Unusual Whales API Reference")
    expect(apiRefContent).toContain("## test_tool")

    const summaryContent = await handlers["docs://tools-summary"]()
    const parsed = JSON.parse(summaryContent)
    expect(parsed.totalTools).toBe(1)
    expect(parsed.tools[0].name).toBe("test_tool")
  })
})
