import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const seasonalityTool = {
  name: "uw_seasonality",
  description: `Access UnusualWhales seasonality data showing historical performance patterns.

Available actions:
- market: Get market-wide seasonality data
- performers: Get top/bottom performers for a month (month required, 1-12)
- monthly: Get monthly seasonality for a ticker (ticker required)
- year_month: Get year-month breakdown for a ticker (ticker required)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["market", "performers", "monthly", "year_month"],
      },
      ticker: {
        type: "string",
        description: "Ticker symbol",
      },
      month: {
        type: "number",
        description: "Month number (1-12)",
        minimum: 1,
        maximum: 12,
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
 * Handle seasonality tool requests.
 *
 * @param args - Tool arguments containing action and optional seasonality parameters
 * @returns JSON string with seasonality data or error message
 */
export async function handleSeasonality(args: Record<string, unknown>): Promise<string> {
  const { action, ticker, month } = args

  switch (action) {
    case "market":
      return formatResponse(await uwFetch("/api/seasonality/market"))

    case "performers":
      if (!month) return formatError("month is required (1-12)")
      if (typeof month !== "number" || month < 1 || month > 12) {
        return formatError("month must be a number between 1 and 12")
      }
      return formatResponse(await uwFetch(`/api/seasonality/${month}/performers`))

    case "monthly":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/seasonality/${encodePath(ticker)}/monthly`))

    case "year_month":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/seasonality/${encodePath(ticker)}/year-month`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
