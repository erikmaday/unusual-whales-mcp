import { uwFetch, formatResponse, formatError } from "../client.js"

export const congressTool = {
  name: "uw_congress",
  description: `Access UnusualWhales congress trading data including trades by congress members.

Available actions:
- recent_trades: Get recent trades by congress members
- late_reports: Get recent late reports by congress members
- congress_trader: Get trades by a specific congress member (name required)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["recent_trades", "late_reports", "congress_trader"],
      },
      name: {
        type: "string",
        description: "Congress member name (for congress_trader action)",
      },
      ticker: {
        type: "string",
        description: "Filter by ticker symbol",
      },
      date: {
        type: "string",
        description: "Date filter in YYYY-MM-DD format",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default 100, max 200)",
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
 * Handle congress tool requests.
 *
 * @param args - Tool arguments containing action and optional congress trade filters
 * @returns JSON string with congress trading data or error message
 */
export async function handleCongress(args: Record<string, unknown>): Promise<string> {
  const { action, name, ticker, date, limit } = args

  switch (action) {
    case "recent_trades":
      return formatResponse(await uwFetch("/api/congress/recent-trades", {
        date: date as string,
        ticker: ticker as string,
        limit: limit as number,
      }))

    case "late_reports":
      return formatResponse(await uwFetch("/api/congress/late-reports", {
        date: date as string,
        ticker: ticker as string,
        limit: limit as number,
      }))

    case "congress_trader":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch("/api/congress/congress-trader", {
        name: name as string,
        date: date as string,
        ticker: ticker as string,
        limit: limit as number,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
