import { z } from "zod"
import { uwFetch } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  dateSchema,
  expirySchema,
  flowGroupSchema,
  flowOutputSchema,
} from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas with all parameters inlined
const flowAlertsSchema = z.object({
  action: z.literal("flow_alerts"),
  ticker_symbol: z.string().describe("Comma-separated list of ticker symbols to filter by. Prefix with '-' to exclude tickers (e.g., 'AAPL,INTC' or '-TSLA,NVDA')").optional(),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").default(100).optional(),
  date: dateSchema.optional(),
  // Premium filters
  min_premium: z.number().int().nonnegative().default(0).describe("The minimum premium on the alert or trade").optional(),
  max_premium: z.number().int().nonnegative().describe("The maximum premium on the alert or trade").optional(),
  // Size filters
  min_size: z.number().int().nonnegative().default(0).describe("The minimum size on that alert. Size is defined as the sum of the sizes of all transactions that make up the alert").optional(),
  max_size: z.number().int().nonnegative().describe("The maximum size on that alert").optional(),
  // DTE filters
  min_dte: z.number().int().min(0).describe("The minimum days to expiry").optional(),
  max_dte: z.number().int().min(0).describe("The maximum days to expiry").optional(),
  // Trade type filters
  is_floor: z.boolean().default(true).describe("Boolean flag whether a transaction is from the floor").optional(),
  is_sweep: z.boolean().default(true).describe("Boolean flag whether a transaction is an intermarket sweep").optional(),
  is_multi_leg: z.boolean().describe("Boolean flag whether the transaction is a multi-leg transaction").optional(),
  // Volume and OI filters
  min_volume: z.number().int().nonnegative().describe("The minimum volume on that alert's contract at the time of the alert").optional(),
  max_volume: z.number().int().nonnegative().describe("The maximum volume on that alert's contract at the time of the alert").optional(),
  min_open_interest: z.number().int().nonnegative().describe("The minimum open interest on that alert's contract at the time of the alert").optional(),
  max_open_interest: z.number().int().nonnegative().describe("The maximum open interest on that alert's contract at the time of the alert").optional(),
  // Boolean trade type filters
  all_opening: z.boolean().default(true).describe("Boolean flag whether all transactions are opening transactions based on open interest, size, and volume").optional(),
  is_call: z.boolean().default(true).describe("Boolean flag whether a transaction is a call").optional(),
  is_put: z.boolean().default(true).describe("Boolean flag whether a transaction is a put").optional(),
  is_ask_side: z.boolean().default(true).describe("Boolean flag whether a transaction is ask side").optional(),
  is_bid_side: z.boolean().default(true).describe("Boolean flag whether a transaction is bid side").optional(),
  is_otm: z.boolean().describe("Only include contracts which are currently out of the money").optional(),
  size_greater_oi: z.boolean().describe("Only include alerts where the size is greater than the open interest").optional(),
  vol_greater_oi: z.boolean().describe("Only include alerts where the volume is greater than the open interest").optional(),
  // Array filters
  rule_name: z.array(z.string()).describe("Filter by alert rule names (e.g., RepeatedHits, FloorTradeSmallCap)").optional(),
  issue_types: z.array(z.string()).describe("Filter by issue types (e.g., Common Stock, ETF, ADR)").optional(),
  // Diff filters
  min_diff: z.number().describe("Minimum OTM diff of the contract (difference between strike and underlying price)").optional(),
  max_diff: z.number().describe("Maximum OTM diff of the contract (difference between strike and underlying price)").optional(),
  // Volume/OI ratio filters
  min_volume_oi_ratio: z.number().int().min(0).describe("The minimum ratio of contract volume to contract open interest. If open interest is zero, the ratio is evaluated as if open interest was one").optional(),
  max_volume_oi_ratio: z.number().int().min(0).describe("The maximum ratio of contract volume to contract open interest. If open interest is zero, the ratio is evaluated as if open interest was one").optional(),
  // Percentage filters
  min_ask_perc: z.number().min(0).max(1).describe("The minimum ask percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_ask_perc: z.number().min(0).max(1).describe("The maximum ask percentage. Decimal proxy for percentage (0 to 1)").optional(),
  min_bid_perc: z.number().min(0).max(1).describe("The minimum bid percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_bid_perc: z.number().min(0).max(1).describe("The maximum bid percentage. Decimal proxy for percentage (0 to 1)").optional(),
  min_bull_perc: z.number().min(0).max(1).describe("The minimum bull percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_bull_perc: z.number().min(0).max(1).describe("The maximum bull percentage. Decimal proxy for percentage (0 to 1)").optional(),
  min_bear_perc: z.number().min(0).max(1).describe("The minimum bear percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_bear_perc: z.number().min(0).max(1).describe("The maximum bear percentage. Decimal proxy for percentage (0 to 1)").optional(),
  // Skew filters
  min_skew: z.number().min(0).max(1).describe("The minimum skew. Decimal proxy for percentage (0 to 1)").optional(),
  max_skew: z.number().min(0).max(1).describe("The maximum skew. Decimal proxy for percentage (0 to 1)").optional(),
  // Price filters
  min_price: z.number().min(0).describe("The minimum price of the underlying asset").optional(),
  max_price: z.number().min(0).describe("The maximum price of the underlying asset").optional(),
  // IV change filters
  min_iv_change: z.number().min(0).describe("The minimum IV change. Unbounded decimal proxy for percentage (e.g., 0.01 for minimum +1% change)").optional(),
  max_iv_change: z.number().min(0).describe("The maximum IV change. Unbounded decimal proxy for percentage (e.g., 0.05 for maximum +5% change)").optional(),
  // Size/volume ratio filters
  min_size_vol_ratio: z.number().min(0).max(1).describe("The minimum size to volume ratio").optional(),
  max_size_vol_ratio: z.number().min(0).max(1).describe("The maximum size to volume ratio").optional(),
  // Spread filters
  min_spread: z.number().min(0).describe("The minimum spread").optional(),
  max_spread: z.number().min(0).max(1).describe("The maximum spread").optional(),
  // Market cap filters
  min_marketcap: z.number().nonnegative().describe("The minimum market capitalization in USD").optional(),
  max_marketcap: z.number().nonnegative().describe("The maximum market capitalization in USD").optional(),
  // Time filters
  newer_than: z.string().describe("Filter for alerts newer than this UTC timestamp").optional(),
  older_than: z.string().describe("Filter for alerts older than this UTC timestamp").optional(),
})

const fullTapeSchema = z.object({
  action: z.literal("full_tape"),
  date: dateSchema.describe("Date in YYYY-MM-DD format (required for full_tape)"),
})

const netFlowExpirySchema = z.object({
  action: z.literal("net_flow_expiry"),
  date: dateSchema.optional(),
  moneyness: z.string().describe("Filter results by moneyness (all, itm, otm, atm). Setting to 'otm' will filter out any contract that was not out of the money at the time of the transaction").optional(),
  tide_type: z.string().describe("Filter results by tide type (all, equity_only, etf_only, index_only). Setting to 'equity_only' will filter out ETFs and indexes").optional(),
  expiration: z.string().describe("Filter results by expiration type (weekly, zero_dte). Setting to 'zero_dte' will only include contracts expiring at 4PM Eastern time today").optional(),
})

const groupGreekFlowSchema = z.object({
  action: z.literal("group_greek_flow"),
  flow_group: flowGroupSchema,
  date: dateSchema.optional(),
})

const groupGreekFlowExpirySchema = z.object({
  action: z.literal("group_greek_flow_expiry"),
  flow_group: flowGroupSchema,
  expiry: expirySchema,
  date: dateSchema.optional(),
})

const litFlowRecentSchema = z.object({
  action: z.literal("lit_flow_recent"),
  date: dateSchema.optional(),
  limit: z.number().int().min(1).max(500).default(100).optional(),
  min_premium: z.number().int().nonnegative().default(0).describe("The minimum premium on the alert or trade").optional(),
  max_premium: z.number().int().nonnegative().describe("The maximum premium on the alert or trade").optional(),
  min_size: z.number().int().nonnegative().default(0).describe("The minimum size on that alert").optional(),
  max_size: z.number().int().nonnegative().describe("The maximum size on that alert").optional(),
  min_volume: z.number().int().nonnegative().default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative().describe("The maximum volume on the contract").optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
  older_than: z.string().describe("Filter trades older than timestamp").optional(),
})

const litFlowTickerSchema = z.object({
  action: z.literal("lit_flow_ticker"),
  ticker: tickerSchema.describe("Ticker symbol (required for lit_flow_ticker action)"),
  date: dateSchema.optional(),
  limit: z.number().int().min(1).max(500).default(500).optional(),
  min_premium: z.number().int().nonnegative().default(0).describe("The minimum premium on the alert or trade").optional(),
  max_premium: z.number().int().nonnegative().describe("The maximum premium on the alert or trade").optional(),
  min_size: z.number().int().nonnegative().default(0).describe("The minimum size on that alert").optional(),
  max_size: z.number().int().nonnegative().describe("The maximum size on that alert").optional(),
  min_volume: z.number().int().nonnegative().default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative().describe("The maximum volume on the contract").optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
  older_than: z.string().describe("Filter trades older than timestamp").optional(),
})

// Discriminated union of all action schemas
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
 * Handle flow tool requests using the tool factory pattern
 */
export const handleFlow = createToolHandler(flowInputSchema, {
  flow_alerts: async (data) => {
    return uwFetch("/api/option-trades/flow-alerts", {
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
    })
  },

  full_tape: async (data) => {
    const path = new PathParamBuilder()
      .add("date", data.date)
      .build("/api/option-trades/full-tape/{date}")
    return uwFetch(path)
  },

  net_flow_expiry: async (data) => {
    return uwFetch("/api/net-flow/expiry", {
      date: data.date,
      moneyness: data.moneyness,
      tide_type: data.tide_type,
      expiration: data.expiration,
    })
  },

  group_greek_flow: async (data) => {
    const path = new PathParamBuilder()
      .add("flow_group", data.flow_group)
      .build("/api/group-flow/{flow_group}/greek-flow")
    return uwFetch(path, {
      date: data.date,
    })
  },

  group_greek_flow_expiry: async (data) => {
    const path = new PathParamBuilder()
      .add("flow_group", data.flow_group)
      .add("expiry", data.expiry)
      .build("/api/group-flow/{flow_group}/greek-flow/{expiry}")
    return uwFetch(path, {
      date: data.date,
    })
  },

  lit_flow_recent: async (data) => {
    return uwFetch("/api/lit-flow/recent", {
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
    })
  },

  lit_flow_ticker: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/lit-flow/{ticker}")
    return uwFetch(path, {
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
    })
  },
})
