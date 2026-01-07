#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import { formatError } from "./client.js"
import { tools, handlers } from "./tools/index.js"

const SERVER_NAME = "unusual-whales"
const SERVER_VERSION = "1.0.0"

const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
  },
)

/**
 * Create a text content response for MCP.
 */
function createTextResponse(text: string): { content: { type: "text"; text: string }[] } {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  }
}

/**
 * Create an error response for MCP with isError flag.
 */
function createErrorResponse(text: string): { content: { type: "text"; text: string }[]; isError: true } {
  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
    isError: true,
  }
}

/**
 * Check if a JSON response string contains an error.
 */
function isErrorResponse(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString)
    return parsed !== null && typeof parsed === "object" && "error" in parsed
  } catch {
    return false
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: tool.annotations,
    })),
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  const handler = handlers[name]
  if (!handler) {
    return createErrorResponse(formatError(`Unknown tool: ${name}`))
  }

  try {
    const result = await handler(args as Record<string, unknown>)
    // Check if the handler returned an error response
    if (isErrorResponse(result)) {
      return createErrorResponse(result)
    }
    return createTextResponse(result)
  } catch (error) {
    return createErrorResponse(
      formatError(
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    )
  }
})

/**
 * Main entry point for the MCP server.
 * Initializes the server and connects via stdio transport.
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`)
}

/**
 * Graceful shutdown handler.
 */
async function shutdown(): Promise<void> {
  console.error("Shutting down...")
  await server.close()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
