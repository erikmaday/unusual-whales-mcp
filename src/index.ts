#!/usr/bin/env node
import { createRequire } from "module"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import { formatError } from "./client.js"
import { logger } from "./logger.js"
import { tools, handlers } from "./tools/index.js"
import { initializeResources } from "./resources/index.js"
import { prompts, handlers as promptHandlers } from "./prompts/index.js"

const require = createRequire(import.meta.url)
const { version } = require("../package.json") as { version: string }

const SERVER_NAME = "unusual-whales"
const SERVER_VERSION = version

// Initialize resources
const { resources, handlers: resourceHandlers } = initializeResources(tools)

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
      resources: {
        listChanged: false,
      },
      prompts: {
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

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: resources.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    })),
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  const handler = resourceHandlers[uri]
  if (!handler) {
    return createErrorResponse(formatError(`Unknown resource: ${uri}`))
  }

  try {
    const content = await handler()
    return {
      contents: [
        {
          uri,
          mimeType: resources.find((r) => r.uri === uri)?.mimeType || "text/plain",
          text: content,
        },
      ],
    }
  } catch (error) {
    return createErrorResponse(
      formatError(
        `Resource read failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    )
  }
})

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments,
    })),
  }
})

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  const handler = promptHandlers[name]
  if (!handler) {
    return createErrorResponse(formatError(`Unknown prompt: ${name}`))
  }

  try {
    const messages = await handler(args || {})
    return {
      messages,
    }
  } catch (error) {
    return createErrorResponse(
      formatError(
        `Prompt execution failed: ${error instanceof Error ? error.message : String(error)}`,
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
  logger.info("Server started", { name: SERVER_NAME, version: SERVER_VERSION })
}

/**
 * Graceful shutdown handler.
 */
async function shutdown(): Promise<void> {
  logger.info("Shutting down")
  await server.close()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

main().catch((error) => {
  logger.error("Fatal error", { error })
  process.exit(1)
})
