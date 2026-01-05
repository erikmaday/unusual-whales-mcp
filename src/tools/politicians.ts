import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const politiciansTool = {
  name: "uw_politicians",
  description: `Access UnusualWhales politician portfolio and trading data.

Available actions:
- people: List all politicians
- portfolio: Get a politician's portfolio (politician_id required)
- recent_trades: Get recent politician trades
- holders: Get politicians holding a ticker (ticker required)
- disclosures: Get annual disclosure file records (optional: politician_id, latest_only, year)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["people", "portfolio", "recent_trades", "holders", "disclosures"],
      },
      politician_id: {
        type: "string",
        description: "Politician ID (for portfolio or disclosures action)",
      },
      latest_only: {
        type: "boolean",
        description: "Return only most recent disclosure per politician (for disclosures action)",
      },
      year: {
        type: "number",
        description: "Filter by disclosure year (for disclosures action)",
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
  const { action, politician_id, ticker, limit, page, latest_only, year } = args

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

    case "disclosures":
      return formatResponse(await uwFetch("/api/politician-portfolios/disclosures", {
        politician_id: politician_id as string,
        latest_only: latest_only as boolean,
        year: year as number,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
