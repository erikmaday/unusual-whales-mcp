import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, limitSchema, formatZodError } from "../schemas/index.js"

const marketActions = [
  "market_tide",
  "sector_tide",
  "etf_tide",
  "sector_etfs",
  "economic_calendar",
  "fda_calendar",
  "correlations",
  "insider_buy_sells",
  "oi_change",
  "spike",
  "top_net_impact",
  "total_options_volume",
] as const

// Action-specific schemas
const marketTideSchema = z.object({
  action: z.literal("market_tide"),
  date: dateSchema.optional(),
  otm_only: z.boolean().describe("Only use OTM options (for market_tide)").default(false).optional(),
  interval_5m: z.boolean().describe("Use 5-minute intervals instead of 1-minute (for market_tide)").default(true).optional(),
})

const sectorTideSchema = z.object({
  action: z.literal("sector_tide"),
  sector: z.string().describe("Market sector (for sector_tide)"),
  date: dateSchema.optional(),
})

const etfTideSchema = z.object({
  action: z.literal("etf_tide"),
  ticker: tickerSchema.describe("Ticker symbol (for etf_tide)"),
  date: dateSchema.optional(),
})

const sectorEtfsSchema = z.object({
  action: z.literal("sector_etfs"),
})

const economicCalendarSchema = z.object({
  action: z.literal("economic_calendar"),
})

const fdaCalendarSchema = z.object({
  action: z.literal("fda_calendar"),
  announced_date_min: z.string().describe("Minimum announced date for FDA calendar").optional(),
  announced_date_max: z.string().describe("Maximum announced date for FDA calendar").optional(),
  target_date_min: z.string().describe("Minimum target date for FDA calendar").optional(),
  target_date_max: z.string().describe("Maximum target date for FDA calendar").optional(),
  drug: z.string().describe("Drug name filter for FDA calendar").optional(),
  ticker: tickerSchema.optional(),
  limit: z.number().int().min(1).max(200).describe("Maximum number of results").default(100).optional(),
})

const correlationsSchema = z.object({
  action: z.literal("correlations"),
  tickers: z.string().describe("Ticker list for correlations"),
  interval: z.string().describe("Time interval (1y, 6m, 3m, 1m) for correlations").default("1Y").optional(),
  start_date: z.string().describe("Start date for correlations (YYYY-MM-DD)").optional(),
  end_date: z.string().describe("End date for correlations (YYYY-MM-DD)").optional(),
})

const insiderBuySellsSchema = z.object({
  action: z.literal("insider_buy_sells"),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").optional(),
})

const oiChangeSchema = z.object({
  action: z.literal("oi_change"),
  date: dateSchema.optional(),
  limit: z.number().int().min(1).max(200).describe("Maximum number of results").default(100).optional(),
  order: z.enum(["asc", "desc"]).describe("Order direction").default("desc").optional(),
})

const spikeSchema = z.object({
  action: z.literal("spike"),
  date: dateSchema.optional(),
})

const topNetImpactSchema = z.object({
  action: z.literal("top_net_impact"),
  date: dateSchema.optional(),
  issue_types: z.string().describe("Issue types filter (for top_net_impact)").optional(),
  limit: z.number().int().min(1).max(100).describe("Maximum number of results").default(20).optional(),
})

const totalOptionsVolumeSchema = z.object({
  action: z.literal("total_options_volume"),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").default(1).optional(),
})

// Union of all action schemas
const marketInputSchema = z.discriminatedUnion("action", [
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
 * Handle market tool requests.
 *
 * @param args - Tool arguments containing action and optional market parameters
 * @returns JSON string with market data or error message
 */
export async function handleMarket(args: Record<string, unknown>): Promise<string> {
  const parsed = marketInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const data = parsed.data

  switch (data.action) {
    case "market_tide":
      return formatResponse(await uwFetch("/api/market/market-tide", {
        date: data.date,
        otm_only: data.otm_only,
        interval_5m: data.interval_5m,
      }))

    case "sector_tide":
      return formatResponse(await uwFetch(`/api/market/${encodePath(data.sector)}/sector-tide`, {
        date: data.date
      }))

    case "etf_tide":
      return formatResponse(await uwFetch(`/api/market/${encodePath(data.ticker)}/etf-tide`, {
        date: data.date
      }))

    case "sector_etfs":
      return formatResponse(await uwFetch("/api/market/sector-etfs"))

    case "economic_calendar":
      return formatResponse(await uwFetch("/api/market/economic-calendar"))

    case "fda_calendar":
      return formatResponse(await uwFetch("/api/market/fda-calendar", {
        announced_date_min: data.announced_date_min,
        announced_date_max: data.announced_date_max,
        target_date_min: data.target_date_min,
        target_date_max: data.target_date_max,
        drug: data.drug,
        ticker: data.ticker,
        limit: data.limit,
      }))

    case "correlations":
      return formatResponse(await uwFetch("/api/market/correlations", {
        tickers: data.tickers,
        interval: data.interval,
        start_date: data.start_date,
        end_date: data.end_date,
      }))

    case "insider_buy_sells":
      return formatResponse(await uwFetch("/api/market/insider-buy-sells", {
        limit: data.limit
      }))

    case "oi_change":
      return formatResponse(await uwFetch("/api/market/oi-change", {
        date: data.date,
        limit: data.limit,
        order: data.order,
      }))

    case "spike":
      return formatResponse(await uwFetch("/api/market/spike", {
        date: data.date
      }))

    case "top_net_impact":
      return formatResponse(await uwFetch("/api/market/top-net-impact", {
        date: data.date,
        "issue_types[]": data.issue_types,
        limit: data.limit,
      }))

    case "total_options_volume":
      return formatResponse(await uwFetch("/api/market/total-options-volume", {
        limit: data.limit
      }))

    default:
      return formatError(`Unknown action: ${(data as { action: string }).action}`)
  }
}
