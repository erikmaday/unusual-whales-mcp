import type { ToolDefinition } from "../tools/index.js"

export type ResourceHandler = () => Promise<string>

export interface ResourceDefinition {
  uri: string
  name: string
  description: string
  mimeType: string
}

interface ResourceRegistration {
  resource: ResourceDefinition
  handler: ResourceHandler
}

/**
 * Generate API reference documentation from tool definitions.
 */
export function generateApiReference(tools: ToolDefinition[]): string {
  const sections = tools.map((tool) => {
    const lines = [
      `## ${tool.name}`,
      "",
      tool.description,
      "",
      "### Input Schema",
      "",
      "```json",
      JSON.stringify(tool.inputSchema, null, 2),
      "```",
      "",
    ]

    if (tool.annotations) {
      lines.push("### Annotations", "")
      const annotations = []
      if (tool.annotations.readOnlyHint) annotations.push("- Read-only operation")
      if (tool.annotations.idempotentHint) annotations.push("- Idempotent operation")
      if (tool.annotations.openWorldHint) annotations.push("- Open world (may return unexpected fields)")
      if (tool.annotations.destructiveHint) annotations.push("- Destructive operation")
      lines.push(...annotations, "")
    }

    return lines.join("\n")
  })

  return [
    "# Unusual Whales API Reference",
    "",
    "This document provides complete reference documentation for all available Unusual Whales API tools.",
    "",
    "## Available Tools",
    "",
    tools.map((t, i) => `${i + 1}. [${t.name}](#${t.name.replace(/_/g, "")})`).join("\n"),
    "",
    ...sections,
  ].join("\n")
}

/**
 * Generate tools summary as JSON.
 */
export function generateToolsSummary(tools: ToolDefinition[]): string {
  const summary = {
    totalTools: tools.length,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description.split("\n")[0], // First line only
      requiredParameters: tool.inputSchema.required || [],
      annotations: tool.annotations || {},
    })),
  }

  return JSON.stringify(summary, null, 2)
}

/**
 * Create resource handler for API reference.
 */
function createApiReferenceHandler(tools: ToolDefinition[]): ResourceHandler {
  return async () => generateApiReference(tools)
}

/**
 * Create resource handler for tools summary.
 */
function createToolsSummaryHandler(tools: ToolDefinition[]): ResourceHandler {
  return async () => generateToolsSummary(tools)
}

/**
 * Initialize resources with the given tools.
 */
export function initializeResources(tools: ToolDefinition[]): {
  resources: ResourceDefinition[]
  handlers: Record<string, ResourceHandler>
} {
  const resourceRegistrations: ResourceRegistration[] = [
    {
      resource: {
        uri: "docs://api-reference",
        name: "API Reference",
        description: "Complete reference documentation for all Unusual Whales API endpoints and tools",
        mimeType: "text/markdown",
      },
      handler: createApiReferenceHandler(tools),
    },
    {
      resource: {
        uri: "docs://tools-summary",
        name: "Tools Summary",
        description: "Summary of available tools with their actions and parameters",
        mimeType: "application/json",
      },
      handler: createToolsSummaryHandler(tools),
    },
  ]

  return {
    resources: resourceRegistrations.map((reg) => reg.resource),
    handlers: Object.fromEntries(
      resourceRegistrations.map((reg) => [reg.resource.uri, reg.handler]),
    ),
  }
}
