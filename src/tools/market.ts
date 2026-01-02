import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

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
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: [
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
        ],
      },
      ticker: {
        type: "string",
        description: "Ticker symbol (for etf_tide)",
      },
      tickers: {
        type: "string",
        description: "Comma-separated list of tickers (for correlations)",
      },
      sector: {
        type: "string",
        description: "Market sector (for sector_tide)",
      },
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format",
      },
      otm_only: {
        type: "boolean",
        description: "Only use OTM options (for market_tide)",
      },
      interval_5m: {
        type: "boolean",
        description: "Use 5-minute intervals instead of 1-minute (for market_tide)",
      },
      interval: {
        type: "string",
        description: "Time interval (1y, 6m, 3m, 1m) for correlations",
      },
      start_date: {
        type: "string",
        description: "Start date for correlations (YYYY-MM-DD)",
      },
      end_date: {
        type: "string",
        description: "End date for correlations (YYYY-MM-DD)",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
      order: {
        type: "string",
        description: "Order direction (asc or desc)",
        enum: ["asc", "desc"],
      },
      issue_types: {
        type: "string",
        description: "Issue types filter (for top_net_impact)",
      },
      announced_date_min: {
        type: "string",
        description: "Minimum announced date for FDA calendar",
      },
      announced_date_max: {
        type: "string",
        description: "Maximum announced date for FDA calendar",
      },
      target_date_min: {
        type: "string",
        description: "Minimum target date for FDA calendar",
      },
      target_date_max: {
        type: "string",
        description: "Maximum target date for FDA calendar",
      },
      drug: {
        type: "string",
        description: "Drug name filter for FDA calendar",
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
 * Handle market tool requests.
 *
 * @param args - Tool arguments containing action and optional market parameters
 * @returns JSON string with market data or error message
 */
export async function handleMarket(args: Record<string, unknown>): Promise<string> {
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
  } = args

  switch (action) {
    case "market_tide":
      return formatResponse(await uwFetch("/api/market/market-tide", {
        date: date as string,
        otm_only: otm_only as boolean,
        interval_5m: interval_5m as boolean,
      }))

    case "sector_tide":
      if (!sector) return formatError("sector is required")
      return formatResponse(await uwFetch(`/api/market/${encodePath(sector)}/sector-tide`, { date: date as string }))

    case "etf_tide":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/market/${encodePath(ticker)}/etf-tide`, { date: date as string }))

    case "sector_etfs":
      return formatResponse(await uwFetch("/api/market/sector-etfs"))

    case "economic_calendar":
      return formatResponse(await uwFetch("/api/market/economic-calendar"))

    case "fda_calendar":
      return formatResponse(await uwFetch("/api/market/fda-calendar", {
        announced_date_min: announced_date_min as string,
        announced_date_max: announced_date_max as string,
        target_date_min: target_date_min as string,
        target_date_max: target_date_max as string,
        drug: drug as string,
        ticker: ticker as string,
        limit: limit as number,
      }))

    case "correlations":
      if (!tickers) return formatError("tickers is required (comma-separated)")
      return formatResponse(await uwFetch("/api/market/correlations", {
        tickers: tickers as string,
        interval: interval as string,
        start_date: start_date as string,
        end_date: end_date as string,
      }))

    case "insider_buy_sells":
      return formatResponse(await uwFetch("/api/market/insider-buy-sells", { limit: limit as number }))

    case "oi_change":
      return formatResponse(await uwFetch("/api/market/oi-change", {
        date: date as string,
        limit: limit as number,
        order: order as string,
      }))

    case "spike":
      return formatResponse(await uwFetch("/api/market/spike", { date: date as string }))

    case "top_net_impact":
      return formatResponse(await uwFetch("/api/market/top-net-impact", {
        date: date as string,
        "issue_types[]": issue_types as string,
        limit: limit as number,
      }))

    case "total_options_volume":
      return formatResponse(await uwFetch("/api/market/total-options-volume", { limit: limit as number }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
