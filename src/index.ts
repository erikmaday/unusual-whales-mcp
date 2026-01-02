#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js"

import { formatError } from "./client.js"
import { stockTool, handleStock } from "./tools/stock.js"
import { optionsTool, handleOptions } from "./tools/options.js"
import { marketTool, handleMarket } from "./tools/market.js"
import { flowTool, handleFlow } from "./tools/flow.js"
import { darkpoolTool, handleDarkpool } from "./tools/darkpool.js"
import { congressTool, handleCongress } from "./tools/congress.js"
import { insiderTool, handleInsider } from "./tools/insider.js"
import { institutionsTool, handleInstitutions } from "./tools/institutions.js"
import { earningsTool, handleEarnings } from "./tools/earnings.js"
import { etfTool, handleEtf } from "./tools/etf.js"
import { screenerTool, handleScreener } from "./tools/screener.js"
import { shortsTool, handleShorts } from "./tools/shorts.js"
import { seasonalityTool, handleSeasonality } from "./tools/seasonality.js"
import { newsTool, handleNews } from "./tools/news.js"
import { alertsTool, handleAlerts } from "./tools/alerts.js"
import { politiciansTool, handlePoliticians } from "./tools/politicians.js"

type ToolHandler = (args: Record<string, unknown>) => Promise<string>

interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required: string[]
  }
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

interface ToolRegistration {
  tool: ToolDefinition
  handler: ToolHandler
}

const toolRegistrations: ToolRegistration[] = [
  { tool: stockTool, handler: handleStock },
  { tool: optionsTool, handler: handleOptions },
  { tool: marketTool, handler: handleMarket },
  { tool: flowTool, handler: handleFlow },
  { tool: darkpoolTool, handler: handleDarkpool },
  { tool: congressTool, handler: handleCongress },
  { tool: insiderTool, handler: handleInsider },
  { tool: institutionsTool, handler: handleInstitutions },
  { tool: earningsTool, handler: handleEarnings },
  { tool: etfTool, handler: handleEtf },
  { tool: screenerTool, handler: handleScreener },
  { tool: shortsTool, handler: handleShorts },
  { tool: seasonalityTool, handler: handleSeasonality },
  { tool: newsTool, handler: handleNews },
  { tool: alertsTool, handler: handleAlerts },
  { tool: politiciansTool, handler: handlePoliticians },
]

const tools = toolRegistrations.map((reg) => reg.tool)
const handlers: Record<string, ToolHandler> = Object.fromEntries(
  toolRegistrations.map((reg) => [reg.tool.name, reg.handler]),
)

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
