#!/usr/bin/env node
import { createRequire } from "module"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

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

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
})

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

// Register all tools
for (const tool of tools) {
  const handler = handlers[tool.name]
  if (!handler) {
    logger.error(`No handler found for tool: ${tool.name}`)
    continue
  }

  // McpServer requires Zod schemas, not JSON schemas
  if (!tool.zodInputSchema) {
    logger.error(`No Zod schema found for tool: ${tool.name}`)
    continue
  }

  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.zodInputSchema,
      annotations: tool.annotations || {},
    },
     
    async (args: any) => {
      try {
        const result = await handler(args)

        // Handle structured response format
        if (typeof result === "object" && result !== null && "text" in result) {
          const structuredResult = result as { text: string; structuredContent?: unknown }

          // Check if the handler returned an error response
          if (isErrorResponse(structuredResult.text)) {
            throw new Error(structuredResult.text)
          }

          // Return response with structured content if available and not null/empty
          if (
            structuredResult.structuredContent !== undefined &&
            structuredResult.structuredContent !== null &&
            (typeof structuredResult.structuredContent !== "object" ||
              Object.keys(structuredResult.structuredContent).length > 0)
          ) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: structuredResult.text,
                },
              ],
              structuredContent: structuredResult.structuredContent as Record<string, unknown>,
            }
          }

          return {
            content: [
              {
                type: "text" as const,
                text: structuredResult.text,
              },
            ],
          }
        }

        // Handle legacy string response format
        if (isErrorResponse(result)) {
          throw new Error(result)
        }

        return {
          content: [
            {
              type: "text" as const,
              text: result,
            },
          ],
        }
      } catch (error) {
        throw new Error(
          formatError(
            `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        )
      }
    },
  )
}

// Register all resources
for (const resource of resources) {
  const handler = resourceHandlers[resource.uri]
  if (!handler) {
    logger.error(`No handler found for resource: ${resource.uri}`)
    continue
  }

  server.registerResource(
    resource.name,
    resource.uri,
    {
      description: resource.description,
      mimeType: resource.mimeType,
    },
    async () => {
      try {
        const content = await handler()
        return {
          contents: [
            {
              uri: resource.uri,
              text: content,
              mimeType: resource.mimeType,
            },
          ],
        }
      } catch (error) {
        throw new Error(
          formatError(
            `Resource read failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        )
      }
    },
  )
}

// Register all prompts
for (const prompt of prompts) {
  const handler = promptHandlers[prompt.name]
  if (!handler) {
    logger.error(`No handler found for prompt: ${prompt.name}`)
    continue
  }

  server.registerPrompt(
    prompt.name,
    {
      description: prompt.description ?? "",
    },
    async () => {
      try {
        // Prompt handlers don't receive args in the old API
        // We need to adapt to the new API which passes extra parameter
        const messages = await handler({})
        return { messages }
      } catch (error) {
        throw new Error(
          formatError(
            `Prompt execution failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        )
      }
    },
  )
}

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
