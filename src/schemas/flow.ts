import { z } from "zod"
import { dateRegex } from "./common.js"

/** Flow trade filters (floor, sweep, multi-leg) */
export const flowTradeFiltersSchema = z.object({
  is_floor: z.boolean().default(true).describe("Boolean flag whether a transaction is from the floor").optional(),
  is_sweep: z.boolean().default(true).describe("Boolean flag whether a transaction is an intermarket sweep").optional(),
  is_multi_leg: z.boolean().describe("Boolean flag whether the transaction is a multi-leg transaction").optional(),
})

/** Extended flow alerts filters */
export const flowAlertsExtendedFiltersSchema = z.object({
  // Volume and OI filters
  min_volume: z.number().int().nonnegative("Volume cannot be negative").describe("The minimum volume on that alert's contract at the time of the alert").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("The maximum volume on that alert's contract at the time of the alert").optional(),
  min_open_interest: z.number().int().nonnegative("Open interest cannot be negative").describe("The minimum open interest on that alert's contract at the time of the alert").optional(),
  max_open_interest: z.number().int().nonnegative("Open interest cannot be negative").describe("The maximum open interest on that alert's contract at the time of the alert").optional(),

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
  min_volume_oi_ratio: z.number().nonnegative().describe("The minimum ratio of contract volume to contract open interest. If open interest is zero, the ratio is evaluated as if open interest was one").optional(),
  max_volume_oi_ratio: z.number().nonnegative().describe("The maximum ratio of contract volume to contract open interest. If open interest is zero, the ratio is evaluated as if open interest was one").optional(),

  // Percentage filters
  min_ask_perc: z.number().describe("The minimum ask percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_ask_perc: z.number().describe("The maximum ask percentage. Decimal proxy for percentage (0 to 1)").optional(),
  min_bid_perc: z.number().describe("The minimum bid percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_bid_perc: z.number().describe("The maximum bid percentage. Decimal proxy for percentage (0 to 1)").optional(),
  min_bull_perc: z.number().describe("The minimum bull percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_bull_perc: z.number().describe("The maximum bull percentage. Decimal proxy for percentage (0 to 1)").optional(),
  min_bear_perc: z.number().describe("The minimum bear percentage. Decimal proxy for percentage (0 to 1)").optional(),
  max_bear_perc: z.number().describe("The maximum bear percentage. Decimal proxy for percentage (0 to 1)").optional(),

  // Skew filters
  min_skew: z.number().describe("The minimum skew. Decimal proxy for percentage (0 to 1)").optional(),
  max_skew: z.number().describe("The maximum skew. Decimal proxy for percentage (0 to 1)").optional(),

  // Price filters
  min_price: z.number().nonnegative("Price cannot be negative").describe("The minimum price of the underlying asset").optional(),
  max_price: z.number().nonnegative("Price cannot be negative").describe("The maximum price of the underlying asset").optional(),

  // IV change filters
  min_iv_change: z.number().describe("The minimum IV change. Unbounded decimal proxy for percentage (e.g., 0.01 for minimum +1% change)").optional(),
  max_iv_change: z.number().describe("The maximum IV change. Unbounded decimal proxy for percentage (e.g., 0.05 for maximum +5% change)").optional(),

  // Size/volume ratio filters
  min_size_vol_ratio: z.number().nonnegative().describe("The minimum size to volume ratio").optional(),
  max_size_vol_ratio: z.number().nonnegative().describe("The maximum size to volume ratio").optional(),

  // Spread filters
  min_spread: z.number().nonnegative().describe("The minimum spread").optional(),
  max_spread: z.number().nonnegative().describe("The maximum spread").optional(),

  // Market cap filters
  min_marketcap: z.number().nonnegative("Market cap cannot be negative").describe("The minimum market capitalization in USD").optional(),
  max_marketcap: z.number().nonnegative("Market cap cannot be negative").describe("The maximum market capitalization in USD").optional(),

  // Time filters
  newer_than: z.string().describe("Filter for alerts newer than this UTC timestamp").optional(),
  older_than: z.string().describe("Filter for alerts older than this UTC timestamp").optional(),
})

/** Net flow expiry filters */
export const netFlowExpiryFiltersSchema = z.object({
  moneyness: z.string().describe("Filter results by moneyness (all, itm, otm, atm). Setting to 'otm' will filter out any contract that was not out of the money at the time of the transaction").optional(),
  tide_type: z.string().describe("Filter results by tide type (all, equity_only, etf_only, index_only). Setting to 'equity_only' will filter out ETFs and indexes").optional(),
  expiration: z.string().regex(dateRegex, "Expiration must be in YYYY-MM-DD format").describe("Filter results by expiration type (weekly, zero_dte). Setting to 'zero_dte' will only include contracts expiring at 4PM Eastern time today").optional(),
})

/** Flow group enum */
export const flowGroupSchema = z.enum([
  "airline", "bank", "basic materials", "china", "communication services",
  "consumer cyclical", "consumer defensive", "crypto", "cyber", "energy",
  "financial services", "gas", "gold", "healthcare", "industrials", "mag7",
  "oil", "real estate", "refiners", "reit", "semi", "silver", "technology",
  "uranium", "utilities",
]).describe("Flow group (e.g., mag7, semi, bank, energy, crypto)")

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Flow alert output schema.
 */
export const flowAlertOutputSchema = z.object({
  ticker: z.string().describe("Stock ticker symbol"),
  option_symbol: z.string().describe("Option contract symbol"),
  timestamp: z.union([z.string(), z.number()]).describe("Transaction timestamp"),
  premium: z.number().describe("Transaction premium amount"),
  size: z.number().describe("Transaction size/quantity"),
  strike: z.number().describe("Strike price"),
  expiry: z.string().describe("Expiration date"),
  option_type: z.enum(["call", "put"]).describe("Option type"),
  side: z.string().optional().describe("Trade side (ask, bid, mid)"),
  volume: z.number().optional().describe("Contract volume"),
  open_interest: z.number().optional().describe("Open interest"),
  is_sweep: z.boolean().optional().describe("Whether trade is an intermarket sweep"),
  is_floor: z.boolean().optional().describe("Whether trade is from the floor"),
  is_multi_leg: z.boolean().optional().describe("Whether trade is multi-leg"),
})

/**
 * Net flow data output schema.
 */
export const netFlowOutputSchema = z.object({
  expiry: z.string().describe("Expiration date"),
  net_premium: z.number().describe("Net premium amount"),
  call_premium: z.number().optional().describe("Total call premium"),
  put_premium: z.number().optional().describe("Total put premium"),
  volume: z.number().optional().describe("Total volume"),
  transactions: z.number().optional().describe("Number of transactions"),
})

/**
 * Greek flow data output schema.
 */
export const greekFlowOutputSchema = z.object({
  ticker: z.string().optional().describe("Stock ticker symbol"),
  date: z.string().optional().describe("Date of the data"),
  delta: z.number().optional().describe("Delta flow"),
  vega: z.number().optional().describe("Vega flow"),
  gamma: z.number().optional().describe("Gamma flow"),
  theta: z.number().optional().describe("Theta flow"),
})

/**
 * Union of all possible flow tool output types.
 */
export const flowOutputSchema = z.union([
  z.array(flowAlertOutputSchema),
  z.array(netFlowOutputSchema),
  z.array(greekFlowOutputSchema),
  z.array(z.unknown()),
  z.record(z.string(), z.unknown()),
])
