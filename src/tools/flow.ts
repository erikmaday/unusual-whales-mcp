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

// Base schema with common fields
const baseFlowSchema = z.object({
  date: dateSchema.optional(),
  ticker_symbol: z.string().describe("Comma-separated list of ticker symbols to filter by. Prefix with '-' to exclude tickers (e.g., 'AAPL,INTC' or '-TSLA,NVDA')").optional(),
}).merge(premiumFilterSchema)
  .merge(sizeFilterSchema)
  .merge(dteFilterSchema)
  .merge(flowTradeFiltersSchema)
  .merge(flowAlertsExtendedFiltersSchema)
  .merge(netFlowExpiryFiltersSchema)

// Action-specific schemas
const flowAlertsSchema = baseFlowSchema.extend({
  action: z.literal("flow_alerts"),
  limit: z.number().int().min(1).max(200).describe("Maximum number of results").default(100).optional(),
})

const fullTapeSchema = baseFlowSchema.extend({
  action: z.literal("full_tape"),
})

const netFlowExpirySchema = baseFlowSchema.extend({
  action: z.literal("net_flow_expiry"),
})

const groupGreekFlowSchema = baseFlowSchema.extend({
  action: z.literal("group_greek_flow"),
  flow_group: flowGroupSchema,
})

const groupGreekFlowExpirySchema = baseFlowSchema.extend({
  action: z.literal("group_greek_flow_expiry"),
  flow_group: flowGroupSchema,
  expiry: expirySchema,
})

const litFlowRecentSchema = baseFlowSchema.extend({
  action: z.literal("lit_flow_recent"),
  limit: z.number().int().min(1).max(200).describe("Maximum number of results").default(100).optional(),
  min_volume: z.number().int().nonnegative("Volume cannot be negative").default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("The maximum volume on the contract").optional(),
})

const litFlowTickerSchema = baseFlowSchema.extend({
  action: z.literal("lit_flow_ticker"),
  ticker: tickerSchema.describe("Ticker symbol (required for lit_flow_ticker action)"),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").default(500).optional(),
  min_volume: z.number().int().nonnegative("Volume cannot be negative").default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("The maximum volume on the contract").optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
  older_than: z.string().describe("Filter trades older than timestamp").optional(),
})

// Union of all action schemas
const flowInputSchema = z.discriminatedUnion("action", [
  flowAlertsSchema,
  fullTapeSchema,
  netFlowExpirySchema,
  groupGreekFlowSchema,
  groupGreekFlowExpirySchema,
  litFlowRecentSchema,
  litFlowTickerSchema,
])


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

  const data = parsed.data

  switch (data.action) {
    case "flow_alerts":
      return formatStructuredResponse(await uwFetch("/api/option-trades/flow-alerts", {
        ticker_symbol: data.ticker_symbol,
        limit: data.limit,
        min_premium: data.min_premium,
        max_premium: data.max_premium,
        min_size: data.min_size,
        max_size: data.max_size,
        min_dte: data.min_dte,
        max_dte: data.max_dte,
        is_floor: data.is_floor,
        is_sweep: data.is_sweep,
        is_multi_leg: data.is_multi_leg,
        // Extended filters
        min_volume: data.min_volume,
        max_volume: data.max_volume,
        min_open_interest: data.min_open_interest,
        max_open_interest: data.max_open_interest,
        all_opening: data.all_opening,
        is_call: data.is_call,
        is_put: data.is_put,
        is_ask_side: data.is_ask_side,
        is_bid_side: data.is_bid_side,
        is_otm: data.is_otm,
        size_greater_oi: data.size_greater_oi,
        vol_greater_oi: data.vol_greater_oi,
        "rule_name[]": data.rule_name,
        "issue_types[]": data.issue_types,
        min_diff: data.min_diff,
        max_diff: data.max_diff,
        min_volume_oi_ratio: data.min_volume_oi_ratio,
        max_volume_oi_ratio: data.max_volume_oi_ratio,
        min_ask_perc: data.min_ask_perc,
        max_ask_perc: data.max_ask_perc,
        min_bid_perc: data.min_bid_perc,
        max_bid_perc: data.max_bid_perc,
        min_bull_perc: data.min_bull_perc,
        max_bull_perc: data.max_bull_perc,
        min_bear_perc: data.min_bear_perc,
        max_bear_perc: data.max_bear_perc,
        min_skew: data.min_skew,
        max_skew: data.max_skew,
        min_price: data.min_price,
        max_price: data.max_price,
        min_iv_change: data.min_iv_change,
        max_iv_change: data.max_iv_change,
        min_size_vol_ratio: data.min_size_vol_ratio,
        max_size_vol_ratio: data.max_size_vol_ratio,
        min_spread: data.min_spread,
        max_spread: data.max_spread,
        min_marketcap: data.min_marketcap,
        max_marketcap: data.max_marketcap,
        newer_than: data.newer_than,
        older_than: data.older_than,
      }))

    case "full_tape":
      if (!data.date) return { text: formatError("date is required") }
      return formatStructuredResponse(await uwFetch(`/api/option-trades/full-tape/${encodePath(data.date)}`))

    case "net_flow_expiry":
      return formatStructuredResponse(await uwFetch("/api/net-flow/expiry", {
        date: data.date,
        moneyness: data.moneyness,
        tide_type: data.tide_type,
        expiration: data.expiration
      }))

    case "group_greek_flow":
      return formatStructuredResponse(await uwFetch(`/api/group-flow/${encodePath(data.flow_group)}/greek-flow`, {
        date: data.date
      }))

    case "group_greek_flow_expiry":
      return formatStructuredResponse(await uwFetch(`/api/group-flow/${encodePath(data.flow_group)}/greek-flow/${encodePath(data.expiry)}`, {
        date: data.date
      }))

    case "lit_flow_recent":
      return formatStructuredResponse(await uwFetch("/api/lit-flow/recent", {
        date: data.date,
        limit: data.limit,
        min_premium: data.min_premium,
        max_premium: data.max_premium,
        min_size: data.min_size,
        max_size: data.max_size,
        min_volume: data.min_volume,
        max_volume: data.max_volume,
      }))

    case "lit_flow_ticker":
      return formatStructuredResponse(await uwFetch(`/api/lit-flow/${encodePath(data.ticker)}`, {
        date: data.date,
        limit: data.limit,
        min_premium: data.min_premium,
        max_premium: data.max_premium,
        min_size: data.min_size,
        max_size: data.max_size,
        min_volume: data.min_volume,
        max_volume: data.max_volume,
        newer_than: data.newer_than,
        older_than: data.older_than,
      }))

    default:
      return { text: formatError(`Unknown action: ${(data as { action: string }).action}`) }
  }
}
