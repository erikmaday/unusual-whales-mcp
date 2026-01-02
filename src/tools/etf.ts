import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const etfTool = {
  name: "uw_etf",
  description: `Access UnusualWhales ETF data including holdings, exposure, inflows/outflows, and weights.

Available actions:
- info: Get ETF information (ticker required)
- holdings: Get ETF holdings (ticker required)
- exposure: Get ETFs that hold a ticker (ticker required)
- in_outflow: Get ETF inflow/outflow data (ticker required)
- weights: Get sector and country weights (ticker required)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["info", "holdings", "exposure", "in_outflow", "weights"],
      },
      ticker: {
        type: "string",
        description: "ETF ticker symbol (e.g., SPY, QQQ)",
      },
    },
    required: ["action", "ticker"],
  },
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle ETF tool requests.
 *
 * @param args - Tool arguments containing action and ticker
 * @returns JSON string with ETF data or error message
 */
export async function handleEtf(args: Record<string, unknown>): Promise<string> {
  const { action, ticker } = args

  if (!ticker) {
    return formatError("ticker is required")
  }

  const safeTicker = encodePath(ticker)

  switch (action) {
    case "info":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/info`))

    case "holdings":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/holdings`))

    case "exposure":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/exposure`))

    case "in_outflow":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/in-outflow`))

    case "weights":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/weights`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
