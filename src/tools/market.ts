import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas
const marketTideSchema = z.object({
  action_type: z.literal("market_tide"),
  date: dateSchema.optional(),
  otm_only: z.boolean().describe("Only use OTM options (for market_tide)").default(false).optional(),
  interval_5m: z.boolean().describe("Use 5-minute intervals instead of 1-minute (for market_tide)").default(true).optional(),
})

const sectorTideSchema = z.object({
  action_type: z.literal("sector_tide"),
  sector: z.string().describe("Market sector (for sector_tide)"),
  date: dateSchema.optional(),
})

const etfTideSchema = z.object({
  action_type: z.literal("etf_tide"),
  ticker: tickerSchema.describe("Ticker symbol (for etf_tide)"),
  date: dateSchema.optional(),
})

const sectorEtfsSchema = z.object({
  action_type: z.literal("sector_etfs"),
})

const economicCalendarSchema = z.object({
  action_type: z.literal("economic_calendar"),
})

const fdaCalendarSchema = z.object({
  action_type: z.literal("fda_calendar"),
  announced_date_min: z.string().describe("Minimum announced date for FDA calendar").optional(),
  announced_date_max: z.string().describe("Maximum announced date for FDA calendar").optional(),
  target_date_min: z.string().describe("Minimum target date for FDA calendar").optional(),
  target_date_max: z.string().describe("Maximum target date for FDA calendar").optional(),
  drug: z.string().describe("Drug name filter for FDA calendar").optional(),
  ticker: tickerSchema.optional(),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional(),
})

const correlationsSchema = z.object({
  action_type: z.literal("correlations"),
  tickers: z.string().describe("Ticker list for correlations"),
  interval: z.string().describe("Time interval (1y, 6m, 3m, 1m) for correlations").default("1Y").optional(),
  start_date: z.string().describe("Start date for correlations (YYYY-MM-DD)").optional(),
  end_date: z.string().describe("End date for correlations (YYYY-MM-DD)").optional(),
})

const insiderBuySellsSchema = z.object({
  action_type: z.literal("insider_buy_sells"),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional(),
})

const oiChangeSchema = z.object({
  action_type: z.literal("oi_change"),
  date: dateSchema.optional(),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional(),
  order: z.enum(["asc", "desc"]).describe("Order direction").optional(),
})

const spikeSchema = z.object({
  action_type: z.literal("spike"),
  date: dateSchema.optional(),
})

const topNetImpactSchema = z.object({
  action_type: z.literal("top_net_impact"),
  date: dateSchema.optional(),
  issue_types: z.string().describe("Issue types filter (for top_net_impact)").optional(),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional(),
})

const totalOptionsVolumeSchema = z.object({
  action_type: z.literal("total_options_volume"),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional(),
})

// Discriminated union of all action schemas
const marketInputSchema = z.discriminatedUnion("action_type", [
  marketTideSchema,
  sectorTideSchema,
  etfTideSchema,
  sectorEtfsSchema,
  economicCalendarSchema,
  fdaCalendarSchema,
  correlationsSchema,
  insiderBuySellsSchema,
  oiChangeSchema,
  spikeSchema,
  topNetImpactSchema,
  totalOptionsVolumeSchema,
])

export const marketTool = {
  name: "uw_market",
  description: `Access UnusualWhales market-wide data including market tide, sector ETFs, economic calendar, FDA calendar, and more.

Available actions:
- market_tide: Get market tide data showing net premium flow (date optional; otm_only, interval_5m optional)
- sector_tide: Get sector-specific tide (sector required; date optional)
- etf_tide: Get ETF-based tide (ticker required; date optional)
- sector_etfs: Get SPDR sector ETF statistics
- economic_calendar: Get economic calendar events
- fda_calendar: Get FDA calendar (announced_date_min/max, target_date_min/max, drug, ticker, limit optional)
- correlations: Get correlations between tickers (tickers required; interval, start_date, end_date optional)
- insider_buy_sells: Get total insider buy/sell statistics (limit optional)
- oi_change: Get top OI changes (date, limit, order optional)
- spike: Get SPIKE values (date optional)
- top_net_impact: Get top tickers by net premium (date, issue_types, limit optional)
- total_options_volume: Get total market options volume (limit optional)`,
  inputSchema: toJsonSchema(marketInputSchema),
  zodInputSchema: marketInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle market tool requests using the tool factory pattern
 */
export const handleMarket = createToolHandler(marketInputSchema, {
  market_tide: async (data) => {
    return uwFetch("/api/market/market-tide", {
      date: data.date,
      otm_only: data.otm_only,
      interval_5m: data.interval_5m,
    })
  },

  sector_tide: async (data) => {
    const path = new PathParamBuilder()
      .add("sector", data.sector)
      .build("/api/market/{sector}/sector-tide")
    return uwFetch(path, {
      date: data.date,
    })
  },

  etf_tide: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/market/{ticker}/etf-tide")
    return uwFetch(path, {
      date: data.date,
    })
  },

  sector_etfs: async () => {
    return uwFetch("/api/market/sector-etfs")
  },

  economic_calendar: async () => {
    return uwFetch("/api/market/economic-calendar")
  },

  fda_calendar: async (data) => {
    return uwFetch("/api/market/fda-calendar", {
      announced_date_min: data.announced_date_min,
      announced_date_max: data.announced_date_max,
      target_date_min: data.target_date_min,
      target_date_max: data.target_date_max,
      drug: data.drug,
      ticker: data.ticker,
      limit: data.limit,
    })
  },

  correlations: async (data) => {
    return uwFetch("/api/market/correlations", {
      tickers: data.tickers,
      interval: data.interval,
      start_date: data.start_date,
      end_date: data.end_date,
    })
  },

  insider_buy_sells: async (data) => {
    return uwFetch("/api/market/insider-buy-sells", {
      limit: data.limit,
    })
  },

  oi_change: async (data) => {
    return uwFetch("/api/market/oi-change", {
      date: data.date,
      limit: data.limit,
      order: data.order,
    })
  },

  spike: async (data) => {
    return uwFetch("/api/market/spike", {
      date: data.date,
    })
  },

  top_net_impact: async (data) => {
    return uwFetch("/api/market/top-net-impact", {
      date: data.date,
      "issue_types[]": data.issue_types,
      limit: data.limit,
    })
  },

  total_options_volume: async (data) => {
    return uwFetch("/api/market/total-options-volume", {
      limit: data.limit,
    })
  },
})
