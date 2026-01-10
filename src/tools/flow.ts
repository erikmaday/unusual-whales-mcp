import { z } from "zod"
import { uwFetch, formatStructuredResponse, encodePath, formatError } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  dateSchema,
  expirySchema,
  limitSchema,
  flowGroupSchema,
  premiumFilterSchema,
  sizeFilterSchema,
  volumeFilterSchema,
  dteFilterSchema,
  flowTradeFiltersSchema,
  flowAlertsExtendedFiltersSchema,
  netFlowExpiryFiltersSchema,
  formatZodError,
  flowOutputSchema,
} from "../schemas/index.js"

const flowActions = ["flow_alerts", "full_tape", "net_flow_expiry", "group_greek_flow", "group_greek_flow_expiry", "lit_flow_recent", "lit_flow_ticker"] as const

const flowInputSchema = z.object({
  action: z.enum(flowActions).describe("The action to perform"),
  date: dateSchema.optional(),
  flow_group: flowGroupSchema.optional(),
  expiry: expirySchema.optional(),
  ticker: tickerSchema.describe("Ticker symbol (required for lit_flow_ticker action)").optional(),
  ticker_symbol: z.string().describe("Comma-separated list of ticker symbols to filter by. Prefix with '-' to exclude tickers (e.g., 'AAPL,INTC' or '-TSLA,NVDA')").optional(),
  limit: limitSchema.default(100).optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp (for lit_flow_ticker)").optional(),
  older_than: z.string().describe("Filter trades older than timestamp (for lit_flow_ticker)").optional(),
}).merge(premiumFilterSchema)
  .merge(sizeFilterSchema)
  .merge(volumeFilterSchema)
  .merge(dteFilterSchema)
  .merge(flowTradeFiltersSchema)
  .merge(flowAlertsExtendedFiltersSchema)
  .merge(netFlowExpiryFiltersSchema)


export const flowTool = {
  name: "uw_flow",
  description: `Access UnusualWhales options flow data including flow alerts, full tape, net flow, group flow, and lit exchange flow.

Available actions:
- flow_alerts: Get flow alerts with extensive filtering options
- full_tape: Get full options tape for a date (date required)
- net_flow_expiry: Get net flow by expiry date (date optional)
- group_greek_flow: Get greek flow (delta & vega) for a flow group (flow_group required; date optional)
- group_greek_flow_expiry: Get greek flow by expiry for a flow group (flow_group, expiry required; date optional)
- lit_flow_recent: Get recent lit exchange trades across the market
- lit_flow_ticker: Get lit exchange trades for a specific ticker (ticker required)

Flow groups: airline, bank, basic materials, china, communication services, consumer cyclical, consumer defensive, crypto, cyber, energy, financial services, gas, gold, healthcare, industrials, mag7, oil, real estate, refiners, reit, semi, silver, technology, uranium, utilities

Flow alerts filtering options include: ticker, premium range, volume range, OI range, DTE range, and more.
Lit flow filtering options include: premium range, size range, volume range, and timestamp filters.`,
  inputSchema: toJsonSchema(flowInputSchema),
  zodInputSchema: flowInputSchema,
  outputSchema: toJsonSchema(flowOutputSchema),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle flow tool requests.
 *
 * @param args - Tool arguments containing action and optional flow filters
 * @returns Structured response with text and optional typed data
 */
export async function handleFlow(args: Record<string, unknown>): Promise<{ text: string; structuredContent?: unknown }> {
  const parsed = flowInputSchema.safeParse(args)
  if (!parsed.success) {
    return { text: formatError(`Invalid input: ${formatZodError(parsed.error)}`) }
  }

  const {
    action,
    date,
    flow_group,
    expiry,
    ticker,
    ticker_symbol,
    limit,
    min_premium,
    max_premium,
    min_size,
    max_size,
    min_dte,
    max_dte,
    is_floor,
    is_sweep,
    is_multi_leg,
    // Extended flow alerts filters
    min_volume,
    max_volume,
    min_open_interest,
    max_open_interest,
    all_opening,
    is_call,
    is_put,
    is_ask_side,
    is_bid_side,
    is_otm,
    size_greater_oi,
    vol_greater_oi,
    rule_name,
    issue_types,
    min_diff,
    max_diff,
    min_volume_oi_ratio,
    max_volume_oi_ratio,
    min_ask_perc,
    max_ask_perc,
    min_bid_perc,
    max_bid_perc,
    min_bull_perc,
    max_bull_perc,
    min_bear_perc,
    max_bear_perc,
    min_skew,
    max_skew,
    min_price,
    max_price,
    min_iv_change,
    max_iv_change,
    min_size_vol_ratio,
    max_size_vol_ratio,
    min_spread,
    max_spread,
    min_marketcap,
    max_marketcap,
    newer_than,
    older_than,
    // Net flow expiry filters
    moneyness,
    tide_type,
    expiration,
  } = parsed.data

  switch (action) {
    case "flow_alerts":
      return formatStructuredResponse(await uwFetch("/api/option-trades/flow-alerts", {
        ticker_symbol,
        limit,
        min_premium,
        max_premium,
        min_size,
        max_size,
        min_dte,
        max_dte,
        is_floor,
        is_sweep,
        is_multi_leg,
        // Extended filters
        min_volume,
        max_volume,
        min_open_interest,
        max_open_interest,
        all_opening,
        is_call,
        is_put,
        is_ask_side,
        is_bid_side,
        is_otm,
        size_greater_oi,
        vol_greater_oi,
        "rule_name[]": rule_name,
        "issue_types[]": issue_types,
        min_diff,
        max_diff,
        min_volume_oi_ratio,
        max_volume_oi_ratio,
        min_ask_perc,
        max_ask_perc,
        min_bid_perc,
        max_bid_perc,
        min_bull_perc,
        max_bull_perc,
        min_bear_perc,
        max_bear_perc,
        min_skew,
        max_skew,
        min_price,
        max_price,
        min_iv_change,
        max_iv_change,
        min_size_vol_ratio,
        max_size_vol_ratio,
        min_spread,
        max_spread,
        min_marketcap,
        max_marketcap,
        newer_than,
        older_than,
      }))

    case "full_tape":
      if (!date) return { text: formatError("date is required") }
      return formatStructuredResponse(await uwFetch(`/api/option-trades/full-tape/${encodePath(date)}`))

    case "net_flow_expiry":
      return formatStructuredResponse(await uwFetch("/api/net-flow/expiry", { date, moneyness, tide_type, expiration }))

    case "group_greek_flow":
      if (!flow_group) return { text: formatError("flow_group is required") }
      return formatStructuredResponse(await uwFetch(`/api/group-flow/${encodePath(flow_group)}/greek-flow`, { date }))

    case "group_greek_flow_expiry":
      if (!flow_group || !expiry) return { text: formatError("flow_group and expiry are required") }
      return formatStructuredResponse(await uwFetch(`/api/group-flow/${encodePath(flow_group)}/greek-flow/${encodePath(expiry)}`, { date }))

    case "lit_flow_recent":
      return formatStructuredResponse(await uwFetch("/api/lit-flow/recent", {
        date,
        limit,
        min_premium,
        max_premium,
        min_size,
        max_size,
        min_volume,
        max_volume,
      }))

    case "lit_flow_ticker":
      if (!ticker) return { text: formatError("ticker is required") }
      return formatStructuredResponse(await uwFetch(`/api/lit-flow/${encodePath(ticker)}`, {
        date,
        limit,
        min_premium,
        max_premium,
        min_size,
        max_size,
        min_volume,
        max_volume,
        newer_than,
        older_than,
      }))

    default:
      return { text: formatError(`Unknown action: ${action}`) }
  }
}
