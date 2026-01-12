import { z } from "zod"
import { uwFetch } from "../client.js"
import {
  toJsonSchema, tickerSchema,
  seasonalityOrderBySchema, minYearsSchema, sP500NasdaqOnlySchema,
  seasonalityLimitSchema, seasonalityOrderDirectionSchema,
} from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas
const marketSchema = z.object({
  action: z.literal("market"),
})

const performersSchema = z.object({
  action: z.literal("performers"),
  month: z.number().min(1).max(12).describe("Month number (1-12)"),
  min_years: minYearsSchema.optional(),
  ticker_for_sector: tickerSchema.describe("A ticker whose sector will be used to filter results").optional(),
  s_p_500_nasdaq_only: sP500NasdaqOnlySchema.optional(),
  min_oi: z.number().int().min(0).describe("Minimum open interest filter").optional(),
  limit: seasonalityLimitSchema.optional(),
  order: seasonalityOrderBySchema.optional(),
  order_direction: seasonalityOrderDirectionSchema.optional(),
})

const monthlySchema = z.object({
  action: z.literal("monthly"),
  ticker: tickerSchema,
})

const yearMonthSchema = z.object({
  action: z.literal("year_month"),
  ticker: tickerSchema,
})

// Discriminated union of all action schemas
const seasonalityInputSchema = z.discriminatedUnion("action", [
  marketSchema,
  performersSchema,
  monthlySchema,
  yearMonthSchema,
])

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
  zodInputSchema: seasonalityInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle seasonality tool requests using the tool factory pattern
 */
export const handleSeasonality = createToolHandler(seasonalityInputSchema, {
  market: async () => {
    return uwFetch("/api/seasonality/market")
  },

  performers: async (data) => {
    const path = new PathParamBuilder()
      .add("month", data.month)
      .build("/api/seasonality/{month}/performers")
    return uwFetch(path, {
      min_years: data.min_years,
      ticker_for_sector: data.ticker_for_sector,
      s_p_500_nasdaq_only: data.s_p_500_nasdaq_only,
      min_oi: data.min_oi,
      limit: data.limit,
      order: data.order,
      order_direction: data.order_direction,
    })
  },

  monthly: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/seasonality/{ticker}/monthly")
    return uwFetch(path)
  },

  year_month: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/seasonality/{ticker}/year-month")
    return uwFetch(path)
  },
})
