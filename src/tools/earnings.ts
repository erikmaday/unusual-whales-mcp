import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const earningsTool = {
  name: "uw_earnings",
  description: `Access UnusualWhales earnings data including premarket and afterhours earnings schedules.

Available actions:
- premarket: Get premarket earnings for a date
- afterhours: Get afterhours earnings for a date
- ticker: Get historical earnings for a ticker (ticker required)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["premarket", "afterhours", "ticker"],
      },
      ticker: {
        type: "string",
        description: "Ticker symbol (for ticker action)",
      },
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
      page: {
        type: "number",
        description: "Page number for pagination",
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
 * Handle earnings tool requests.
 *
 * @param args - Tool arguments containing action and optional earnings parameters
 * @returns JSON string with earnings data or error message
 */
export async function handleEarnings(args: Record<string, unknown>): Promise<string> {
  const { action, ticker, date, limit, page } = args

  switch (action) {
    case "premarket":
      return formatResponse(await uwFetch("/api/earnings/premarket", {
        date: date as string,
        limit: limit as number,
        page: page as number,
      }))

    case "afterhours":
      return formatResponse(await uwFetch("/api/earnings/afterhours", {
        date: date as string,
        limit: limit as number,
        page: page as number,
      }))

    case "ticker":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/earnings/${encodePath(ticker)}`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
