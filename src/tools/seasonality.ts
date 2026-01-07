import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import {
  toJsonSchema, tickerSchema, formatZodError, limitSchema, orderSchema,
  seasonalityOrderBySchema,
} from "../schemas.js"

const seasonalityActions = ["market", "performers", "monthly", "year_month"] as const

const seasonalityInputSchema = z.object({
  action: z.enum(seasonalityActions).describe("The action to perform"),
  ticker: tickerSchema.optional(),
  month: z.number().min(1).max(12).describe("Month number (1-12)").optional(),
  // Performers-specific optional parameters
  min_years: z.number().int().min(1).describe("Minimum years of data required (default: 10)").optional(),
  ticker_for_sector: tickerSchema.describe("A ticker whose sector will be used to filter results").optional(),
  s_p_500_nasdaq_only: z.boolean().describe("Only return tickers in S&P 500 or Nasdaq 100").optional(),
  min_oi: z.number().int().nonnegative("Open interest cannot be negative").describe("Minimum open interest filter").optional(),
  limit: limitSchema.optional(),
  order: seasonalityOrderBySchema.optional(),
  order_direction: orderSchema.optional(),
})


export const seasonalityTool = {
  name: "uw_seasonality",
  description: `Access UnusualWhales seasonality data showing historical performance patterns.

Available actions:
- market: Get market-wide seasonality data
- performers: Get top/bottom performers for a month (month required, 1-12)
  Optional filters: min_years, ticker_for_sector, s_p_500_nasdaq_only, min_oi, limit, order, order_direction
- monthly: Get monthly seasonality for a ticker (ticker required)
- year_month: Get year-month breakdown for a ticker (ticker required)`,
  inputSchema: toJsonSchema(seasonalityInputSchema),
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
  const parsed = seasonalityInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const {
    action, ticker, month,
    min_years, ticker_for_sector, s_p_500_nasdaq_only, min_oi, limit, order, order_direction,
  } = parsed.data

  switch (action) {
    case "market":
      return formatResponse(await uwFetch("/api/seasonality/market"))

    case "performers":
      if (month === undefined) return formatError("month is required (1-12)")
      return formatResponse(await uwFetch(`/api/seasonality/${month}/performers`, {
        min_years,
        ticker_for_sector,
        s_p_500_nasdaq_only,
        min_oi,
        limit,
        order,
        order_direction,
      }))

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
