import { uwFetch, formatResponse, formatError } from "../client.js"

export const newsTool = {
  name: "uw_news",
  description: `Access UnusualWhales news headlines.

Available actions:
- headlines: Get news headlines with optional ticker filter`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["headlines"],
      },
      ticker: {
        type: "string",
        description: "Filter by ticker symbol",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
    },
    required: ["action"],
  },
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle news tool requests.
 *
 * @param args - Tool arguments containing action and optional news filters
 * @returns JSON string with news data or error message
 */
export async function handleNews(args: Record<string, unknown>): Promise<string> {
  const { action, ticker, limit } = args

  switch (action) {
    case "headlines":
      return formatResponse(await uwFetch("/api/news/headlines", {
        ticker: ticker as string,
        limit: limit as number,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
