import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, limitSchema, orderSchema, formatZodError } from "../schemas.js"

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

const marketInputSchema = z.object({
  action: z.enum(marketActions).describe("The action to perform"),
  ticker: tickerSchema.describe("Ticker symbol (for etf_tide)").optional(),
  tickers: z.string().describe("Comma-separated list of tickers (for correlations)").optional(),
  sector: z.string().describe("Market sector (for sector_tide)").optional(),
  date: dateSchema.optional(),
  otm_only: z.boolean().describe("Only use OTM options (for market_tide)").optional(),
  interval_5m: z.boolean().describe("Use 5-minute intervals instead of 1-minute (for market_tide)").optional(),
  interval: z.string().describe("Time interval (1y, 6m, 3m, 1m) for correlations").optional(),
  start_date: z.string().describe("Start date for correlations (YYYY-MM-DD)").optional(),
  end_date: z.string().describe("End date for correlations (YYYY-MM-DD)").optional(),
  limit: limitSchema.optional(),
  order: orderSchema.optional(),
  issue_types: z.string().describe("Issue types filter (for top_net_impact)").optional(),
  announced_date_min: z.string().describe("Minimum announced date for FDA calendar").optional(),
  announced_date_max: z.string().describe("Maximum announced date for FDA calendar").optional(),
  target_date_min: z.string().describe("Minimum target date for FDA calendar").optional(),
  target_date_max: z.string().describe("Maximum target date for FDA calendar").optional(),
  drug: z.string().describe("Drug name filter for FDA calendar").optional(),
})


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
  annotations: {
    readOnlyHint: true,
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

  const {
    action,
    ticker,
    tickers,
    sector,
    date,
    otm_only,
    interval_5m,
    interval,
    start_date,
    end_date,
    limit,
    order,
    issue_types,
    announced_date_min,
    announced_date_max,
    target_date_min,
    target_date_max,
    drug,
  } = parsed.data

  switch (action) {
    case "market_tide":
      return formatResponse(await uwFetch("/api/market/market-tide", {
        date,
        otm_only,
        interval_5m,
      }))

    case "sector_tide":
      if (!sector) return formatError("sector is required")
      return formatResponse(await uwFetch(`/api/market/${encodePath(sector)}/sector-tide`, { date }))

    case "etf_tide":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/market/${encodePath(ticker)}/etf-tide`, { date }))

    case "sector_etfs":
      return formatResponse(await uwFetch("/api/market/sector-etfs"))

    case "economic_calendar":
      return formatResponse(await uwFetch("/api/market/economic-calendar"))

    case "fda_calendar":
      return formatResponse(await uwFetch("/api/market/fda-calendar", {
        announced_date_min,
        announced_date_max,
        target_date_min,
        target_date_max,
        drug,
        ticker,
        limit,
      }))

    case "correlations":
      if (!tickers) return formatError("tickers is required (comma-separated)")
      return formatResponse(await uwFetch("/api/market/correlations", {
        tickers,
        interval,
        start_date,
        end_date,
      }))

    case "insider_buy_sells":
      return formatResponse(await uwFetch("/api/market/insider-buy-sells", { limit }))

    case "oi_change":
      return formatResponse(await uwFetch("/api/market/oi-change", {
        date,
        limit,
        order,
      }))

    case "spike":
      return formatResponse(await uwFetch("/api/market/spike", { date }))

    case "top_net_impact":
      return formatResponse(await uwFetch("/api/market/top-net-impact", {
        date,
        "issue_types[]": issue_types,
        limit,
      }))

    case "total_options_volume":
      return formatResponse(await uwFetch("/api/market/total-options-volume", { limit }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
