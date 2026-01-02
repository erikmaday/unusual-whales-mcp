import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const politiciansTool = {
  name: "uw_politicians",
  description: `Access UnusualWhales politician portfolio and trading data.

Available actions:
- people: List all politicians
- portfolio: Get a politician's portfolio (politician_id required)
- recent_trades: Get recent politician trades
- holders: Get politicians holding a ticker (ticker required)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["people", "portfolio", "recent_trades", "holders"],
      },
      politician_id: {
        type: "string",
        description: "Politician ID (for portfolio action)",
      },
      ticker: {
        type: "string",
        description: "Ticker symbol (for holders action)",
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
 * Handle politicians tool requests.
 *
 * @param args - Tool arguments containing action and optional politician parameters
 * @returns JSON string with politician portfolio data or error message
 */
export async function handlePoliticians(args: Record<string, unknown>): Promise<string> {
  const { action, politician_id, ticker, limit, page } = args

  switch (action) {
    case "people":
      return formatResponse(await uwFetch("/api/politician-portfolios/people"))

    case "portfolio":
      if (!politician_id) return formatError("politician_id is required")
      return formatResponse(await uwFetch(`/api/politician-portfolios/${encodePath(politician_id)}`))

    case "recent_trades":
      return formatResponse(await uwFetch("/api/politician-portfolios/recent_trades", {
        limit: limit as number,
        page: page as number,
      }))

    case "holders":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/politician-portfolios/holders/${encodePath(ticker)}`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
