import { z } from "zod"

/**
 * Convert a Zod schema to JSON Schema format for MCP tool definitions.
 * Uses Zod v4's native toJSONSchema method.
 * Strips the $schema property and ensures proper typing.
 */
export function toJsonSchema<T extends z.core.$ZodType>(schema: T): {
  type: "object"
  properties: Record<string, unknown>
  required: string[]
} {
  const jsonSchema = z.toJSONSchema(schema)
  // Remove $schema property and return with proper typing
  const { $schema: _, ...rest } = jsonSchema as Record<string, unknown>
  return rest as {
    type: "object"
    properties: Record<string, unknown>
    required: string[]
  }
}

/**
 * Format Zod validation errors into a readable string.
 */
export function formatZodError<T>(error: z.ZodError<T>): string {
  return error.issues.map((issue) => issue.message).join(", ")
}

// ============================================================================
// Shared field schemas - reusable across tools
// ============================================================================

/** Date regex pattern for YYYY-MM-DD format */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

/** Stock ticker symbol (e.g., AAPL, MSFT, TSLA) */
export const tickerSchema = z.string()
  .min(1, "Ticker symbol is required")
  .max(10, "Ticker symbol too long")
  .describe("Stock ticker symbol (e.g., AAPL, MSFT)")

/** Date in YYYY-MM-DD format */
export const dateSchema = z.string()
  .regex(dateRegex, "Date must be in YYYY-MM-DD format")
  .describe("Date in YYYY-MM-DD format")

/** Option expiry date in YYYY-MM-DD format */
export const expirySchema = z.string()
  .regex(dateRegex, "Expiry date must be in YYYY-MM-DD format")
  .describe("Option expiry date in YYYY-MM-DD format")

/** Maximum number of results */
export const limitSchema = z.number()
  .int("Limit must be an integer")
  .positive("Limit must be positive")
  .describe("Maximum number of results")

/** Option strike price */
export const strikeSchema = z.number()
  .positive("Strike price must be positive")
  .describe("Option strike price")

/** Option type (call or put) */
export const optionTypeSchema = z.enum(["call", "put"]).describe("Option type (call or put)")

/** Order direction */
export const orderSchema = z.enum(["asc", "desc"]).describe("Order direction")

// ============================================================================
// Premium/Size/Volume filter schemas - for flow and darkpool tools
// ============================================================================

export const premiumFilterSchema = z.object({
  min_premium: z.number().nonnegative("Premium cannot be negative").describe("Minimum premium filter").optional(),
  max_premium: z.number().nonnegative("Premium cannot be negative").describe("Maximum premium filter").optional(),
})

export const sizeFilterSchema = z.object({
  min_size: z.number().int().nonnegative("Size cannot be negative").describe("Minimum size/volume filter").optional(),
  max_size: z.number().int().nonnegative("Size cannot be negative").describe("Maximum size/volume filter").optional(),
})

export const volumeFilterSchema = z.object({
  min_volume: z.number().int().nonnegative("Volume cannot be negative").describe("Minimum volume filter").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("Maximum volume filter").optional(),
})

export const oiFilterSchema = z.object({
  min_oi: z.number().int().nonnegative("Open interest cannot be negative").describe("Minimum open interest filter").optional(),
  max_oi: z.number().int().nonnegative("Open interest cannot be negative").describe("Maximum open interest filter").optional(),
})

export const dteFilterSchema = z.object({
  min_dte: z.number().int().nonnegative("DTE cannot be negative").describe("Minimum days to expiration").optional(),
  max_dte: z.number().int().nonnegative("DTE cannot be negative").describe("Maximum days to expiration").optional(),
})

// ============================================================================
// Flow-specific schemas
// ============================================================================

export const flowTradeFiltersSchema = z.object({
  is_floor: z.boolean().describe("Filter for floor trades").optional(),
  is_sweep: z.boolean().describe("Filter for sweep trades").optional(),
  is_multi_leg: z.boolean().describe("Filter for multi-leg trades").optional(),
  is_unusual: z.boolean().describe("Filter for unusual trades").optional(),
  is_golden_sweep: z.boolean().describe("Filter for golden sweep trades").optional(),
})

export const flowAlertsExtendedFiltersSchema = z.object({
  // Volume and OI filters
  min_volume: z.number().int().nonnegative("Volume cannot be negative").describe("Minimum volume filter").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("Maximum volume filter").optional(),
  min_open_interest: z.number().int().nonnegative("Open interest cannot be negative").describe("Minimum open interest filter").optional(),
  max_open_interest: z.number().int().nonnegative("Open interest cannot be negative").describe("Maximum open interest filter").optional(),

  // Boolean trade type filters
  all_opening: z.boolean().describe("Filter for opening trades only").optional(),
  is_call: z.boolean().describe("Filter for call options").optional(),
  is_put: z.boolean().describe("Filter for put options").optional(),
  is_ask_side: z.boolean().describe("Filter for ask-side trades").optional(),
  is_bid_side: z.boolean().describe("Filter for bid-side trades").optional(),
  is_otm: z.boolean().describe("Filter for out-of-the-money options").optional(),
  size_greater_oi: z.boolean().describe("Filter for trades where size > open interest").optional(),
  vol_greater_oi: z.boolean().describe("Filter for trades where volume > open interest").optional(),

  // Array filters
  "rule_name[]": z.array(z.string()).describe("Filter by rule names").optional(),
  "issue_types[]": z.array(z.string()).describe("Filter by issue types").optional(),

  // Diff filters
  min_diff: z.number().describe("Minimum diff filter").optional(),
  max_diff: z.number().describe("Maximum diff filter").optional(),

  // Volume/OI ratio filters
  min_volume_oi_ratio: z.number().nonnegative().describe("Minimum volume/OI ratio").optional(),
  max_volume_oi_ratio: z.number().nonnegative().describe("Maximum volume/OI ratio").optional(),

  // Percentage filters
  min_ask_perc: z.number().describe("Minimum ask percentage").optional(),
  max_ask_perc: z.number().describe("Maximum ask percentage").optional(),
  min_bid_perc: z.number().describe("Minimum bid percentage").optional(),
  max_bid_perc: z.number().describe("Maximum bid percentage").optional(),
  min_bull_perc: z.number().describe("Minimum bullish percentage").optional(),
  max_bull_perc: z.number().describe("Maximum bullish percentage").optional(),
  min_bear_perc: z.number().describe("Minimum bearish percentage").optional(),
  max_bear_perc: z.number().describe("Maximum bearish percentage").optional(),

  // Skew filters
  min_skew: z.number().describe("Minimum skew filter").optional(),
  max_skew: z.number().describe("Maximum skew filter").optional(),

  // Price filters
  min_price: z.number().nonnegative("Price cannot be negative").describe("Minimum price filter").optional(),
  max_price: z.number().nonnegative("Price cannot be negative").describe("Maximum price filter").optional(),

  // IV change filters
  min_iv_change: z.number().describe("Minimum IV change filter").optional(),
  max_iv_change: z.number().describe("Maximum IV change filter").optional(),

  // Size/volume ratio filters
  min_size_vol_ratio: z.number().nonnegative().describe("Minimum size/volume ratio").optional(),
  max_size_vol_ratio: z.number().nonnegative().describe("Maximum size/volume ratio").optional(),

  // Spread filters
  min_spread: z.number().nonnegative().describe("Minimum spread filter").optional(),
  max_spread: z.number().nonnegative().describe("Maximum spread filter").optional(),

  // Market cap filters
  min_marketcap: z.number().nonnegative("Market cap cannot be negative").describe("Minimum market cap filter").optional(),
  max_marketcap: z.number().nonnegative("Market cap cannot be negative").describe("Maximum market cap filter").optional(),

  // Time filters
  newer_than: z.string().describe("Filter for trades newer than this timestamp").optional(),
  older_than: z.string().describe("Filter for trades older than this timestamp").optional(),
})

export const netFlowExpiryFiltersSchema = z.object({
  moneyness: z.string().describe("Filter by moneyness (e.g., ITM, OTM, ATM)").optional(),
  tide_type: z.string().describe("Filter by tide type").optional(),
  expiration: z.string().regex(dateRegex, "Expiration must be in YYYY-MM-DD format").describe("Filter by specific expiration date").optional(),
})

export const flowGroupSchema = z.enum([
  "airline", "bank", "basic materials", "china", "communication services",
  "consumer cyclical", "consumer defensive", "crypto", "cyber", "energy",
  "financial services", "gas", "gold", "healthcare", "industrials", "mag7",
  "oil", "real estate", "refiners", "reit", "semi", "silver", "technology",
  "uranium", "utilities",
]).describe("Flow group (e.g., mag7, semi, bank, energy, crypto)")

// ============================================================================
// Candle size schema
// ============================================================================

export const candleSizeSchema = z.enum([
  "1m", "5m", "10m", "15m", "30m", "1h", "4h", "1d",
]).describe("Candle size (1m, 5m, 10m, 15m, 30m, 1h, 4h, 1d)")

// ============================================================================
// Timeframe schemas
// ============================================================================

export const timeframeSchema = z.string().describe("Timeframe for historical data")

// ============================================================================
// Insider transaction filter schemas
// ============================================================================

export const insiderTransactionFiltersSchema = z.object({
  // Market cap filters
  min_marketcap: z.number().int().nonnegative("Market cap cannot be negative").describe("Minimum market cap filter").optional(),
  max_marketcap: z.number().int().nonnegative("Market cap cannot be negative").describe("Maximum market cap filter").optional(),
  market_cap_size: z.string().describe("Size category of company market cap (small, mid, large)").optional(),

  // Earnings DTE filters
  min_earnings_dte: z.number().int().nonnegative("DTE cannot be negative").describe("Minimum days to earnings").optional(),
  max_earnings_dte: z.number().int().nonnegative("DTE cannot be negative").describe("Maximum days to earnings").optional(),

  // Share amount filters
  min_amount: z.number().int().nonnegative("Amount cannot be negative").describe("Minimum number of shares in transaction").optional(),
  max_amount: z.number().int().nonnegative("Amount cannot be negative").describe("Maximum number of shares in transaction").optional(),

  // Security type filters
  common_stock_only: z.boolean().describe("Only include common stock transactions").optional(),
  security_ad_codes: z.string().describe("Filter by security acquisition disposition codes").optional(),
})

/** Delta value for risk reversal skew (10 or 25) */
export const deltaSchema = z.enum(["10", "25"]).describe("Delta value for risk reversal skew (10 or 25, representing 0.10 or 0.25)")

// ============================================================================
// Seasonality-specific schemas
// ============================================================================

/** Seasonality performers order by column */
export const seasonalityOrderBySchema = z.enum([
  "month", "positive_closes", "years", "positive_months_perc",
  "median_change", "avg_change", "max_change", "min_change",
]).describe("Column to order seasonality results by")

// ============================================================================
// Pagination and ordering schemas
// ============================================================================

/** Pagination page number */
export const pageSchema = z.number()
  .int("Page must be an integer")
  .positive("Page must be positive")
  .describe("Page number for paginated results")

/** IV rank timespan */
export const timespanSchema = z.string().describe("Timespan for IV rank data")

// ============================================================================
// Stock option contract filter schemas
// ============================================================================

export const optionContractFiltersSchema = z.object({
  vol_greater_oi: z.boolean().describe("Filter for contracts where volume > open interest").optional(),
  exclude_zero_vol_chains: z.boolean().describe("Exclude chains with zero volume").optional(),
  exclude_zero_dte: z.boolean().describe("Exclude zero days to expiration contracts").optional(),
  exclude_zero_oi_chains: z.boolean().describe("Exclude chains with zero open interest").optional(),
  maybe_otm_only: z.boolean().describe("Filter for out-of-the-money options only").optional(),
  option_symbol: z.string().describe("Specific option symbol to filter by").optional(),
})

// ============================================================================
// Stock flow filter schemas
// ============================================================================

export const stockFlowFiltersSchema = z.object({
  is_ask_side: z.boolean().describe("Filter for ask-side trades").optional(),
  is_bid_side: z.boolean().describe("Filter for bid-side trades").optional(),
  side: z.string().describe("Filter by trade side").optional(),
  min_premium: z.number().nonnegative("Premium cannot be negative").describe("Minimum premium filter").optional(),
  filter: z.string().describe("Filter type for intraday flow").optional(),
})

// ============================================================================
// Stock screener filter schemas
// ============================================================================

export const stockScreenerFiltersSchema = z.object({
  // Issue types and sectors
  "issue_types[]": z.array(z.string()).describe("Filter by issue types").optional(),
  "sectors[]": z.array(z.string()).describe("Filter by market sectors").optional(),

  // Price change filters
  min_change: z.number().describe("Minimum price change").optional(),
  max_change: z.number().describe("Maximum price change").optional(),

  // Underlying price filters
  min_underlying_price: z.number().describe("Minimum underlying price").optional(),
  max_underlying_price: z.number().describe("Maximum underlying price").optional(),

  // Boolean filters
  is_s_p_500: z.boolean().describe("Filter for S&P 500 stocks only").optional(),
  has_dividends: z.boolean().describe("Filter for stocks with dividends").optional(),

  // 3-day percentage filters
  min_perc_3_day_total: z.number().describe("Minimum 3-day total percentage").optional(),
  max_perc_3_day_total: z.number().describe("Maximum 3-day total percentage").optional(),
  min_perc_3_day_call: z.number().describe("Minimum 3-day call percentage").optional(),
  max_perc_3_day_call: z.number().describe("Maximum 3-day call percentage").optional(),
  min_perc_3_day_put: z.number().describe("Minimum 3-day put percentage").optional(),
  max_perc_3_day_put: z.number().describe("Maximum 3-day put percentage").optional(),

  // 30-day percentage filters
  min_perc_30_day_total: z.number().describe("Minimum 30-day total percentage").optional(),
  max_perc_30_day_total: z.number().describe("Maximum 30-day total percentage").optional(),
  min_perc_30_day_call: z.number().describe("Minimum 30-day call percentage").optional(),
  max_perc_30_day_call: z.number().describe("Maximum 30-day call percentage").optional(),
  min_perc_30_day_put: z.number().describe("Minimum 30-day put percentage").optional(),
  max_perc_30_day_put: z.number().describe("Maximum 30-day put percentage").optional(),

  // OI change percentage filters
  min_total_oi_change_perc: z.number().describe("Minimum total OI change percentage").optional(),
  max_total_oi_change_perc: z.number().describe("Maximum total OI change percentage").optional(),
  min_call_oi_change_perc: z.number().describe("Minimum call OI change percentage").optional(),
  max_call_oi_change_perc: z.number().describe("Maximum call OI change percentage").optional(),
  min_put_oi_change_perc: z.number().describe("Minimum put OI change percentage").optional(),
  max_put_oi_change_perc: z.number().describe("Maximum put OI change percentage").optional(),

  // Implied move filters
  min_implied_move: z.number().describe("Minimum implied move").optional(),
  max_implied_move: z.number().describe("Maximum implied move").optional(),
  min_implied_move_perc: z.number().describe("Minimum implied move percentage").optional(),
  max_implied_move_perc: z.number().describe("Maximum implied move percentage").optional(),

  // Volatility and IV rank filters
  min_volatility: z.number().describe("Minimum volatility").optional(),
  max_volatility: z.number().describe("Maximum volatility").optional(),
  min_iv_rank: z.number().describe("Minimum IV rank").optional(),
  max_iv_rank: z.number().describe("Maximum IV rank").optional(),

  // Call/put volume filters
  min_call_volume: z.number().int().nonnegative().describe("Minimum call volume").optional(),
  max_call_volume: z.number().int().nonnegative().describe("Maximum call volume").optional(),
  min_put_volume: z.number().int().nonnegative().describe("Minimum put volume").optional(),
  max_put_volume: z.number().int().nonnegative().describe("Maximum put volume").optional(),

  // Call/put premium filters
  min_call_premium: z.number().describe("Minimum call premium").optional(),
  max_call_premium: z.number().describe("Maximum call premium").optional(),
  min_put_premium: z.number().describe("Minimum put premium").optional(),
  max_put_premium: z.number().describe("Maximum put premium").optional(),

  // Net premium filters
  min_net_premium: z.number().describe("Minimum net premium").optional(),
  max_net_premium: z.number().describe("Maximum net premium").optional(),
  min_net_call_premium: z.number().describe("Minimum net call premium").optional(),
  max_net_call_premium: z.number().describe("Maximum net call premium").optional(),
  min_net_put_premium: z.number().describe("Minimum net put premium").optional(),
  max_net_put_premium: z.number().describe("Maximum net put premium").optional(),

  // OI vs volume filters
  min_oi_vs_vol: z.number().describe("Minimum OI vs volume ratio").optional(),
  max_oi_vs_vol: z.number().describe("Maximum OI vs volume ratio").optional(),

  // Put/call ratio filters
  min_put_call_ratio: z.number().describe("Minimum put/call ratio").optional(),
  max_put_call_ratio: z.number().describe("Maximum put/call ratio").optional(),

  // Stock volume vs avg filters
  min_stock_volume_vs_avg30_volume: z.number().describe("Minimum stock volume vs 30-day average").optional(),
  max_avg30_volume: z.number().describe("Maximum 30-day average volume").optional(),

  // Date filter
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe("Filter by specific date").optional(),
})

// ============================================================================
// Option contract screener filter schemas
// ============================================================================

export const optionContractScreenerFiltersSchema = z.object({
  // Ticker and sector filters
  ticker_symbol: z.string().describe("Filter by ticker symbol").optional(),
  "sectors[]": z.array(z.string()).describe("Filter by market sectors").optional(),

  // Underlying price filters
  min_underlying_price: z.number().describe("Minimum underlying price").optional(),
  max_underlying_price: z.number().describe("Maximum underlying price").optional(),

  // Ex-div filter
  exclude_ex_div_ticker: z.boolean().describe("Exclude tickers with ex-dividend dates").optional(),

  // Diff filters
  min_diff: z.number().describe("Minimum diff").optional(),
  max_diff: z.number().describe("Maximum diff").optional(),

  // Strike filters
  min_strike: z.number().describe("Minimum strike price").optional(),
  max_strike: z.number().describe("Maximum strike price").optional(),

  // Option type
  type: z.enum(["call", "put"]).describe("Option type filter").optional(),

  // Expiry dates
  "expiry_dates[]": z.array(z.string()).describe("Filter by expiry dates").optional(),

  // Market cap filters
  min_marketcap: z.number().describe("Minimum market cap").optional(),
  max_marketcap: z.number().describe("Maximum market cap").optional(),

  // Volume filters
  min_volume: z.number().int().nonnegative().describe("Minimum volume").optional(),
  max_volume: z.number().int().nonnegative().describe("Maximum volume").optional(),

  // 30-day average volume filters
  min_ticker_30_d_avg_volume: z.number().describe("Minimum ticker 30-day average volume").optional(),
  max_ticker_30_d_avg_volume: z.number().describe("Maximum ticker 30-day average volume").optional(),
  min_contract_30_d_avg_volume: z.number().describe("Minimum contract 30-day average volume").optional(),
  max_contract_30_d_avg_volume: z.number().describe("Maximum contract 30-day average volume").optional(),

  // Multileg volume ratio filters
  min_multileg_volume_ratio: z.number().describe("Minimum multileg volume ratio").optional(),
  max_multileg_volume_ratio: z.number().describe("Maximum multileg volume ratio").optional(),

  // Floor volume ratio filters
  min_floor_volume_ratio: z.number().describe("Minimum floor volume ratio").optional(),
  max_floor_volume_ratio: z.number().describe("Maximum floor volume ratio").optional(),

  // Percentage change filters
  min_perc_change: z.number().describe("Minimum percentage change").optional(),
  max_perc_change: z.number().describe("Maximum percentage change").optional(),
  min_daily_perc_change: z.number().describe("Minimum daily percentage change").optional(),
  max_daily_perc_change: z.number().describe("Maximum daily percentage change").optional(),

  // Average price filters
  min_avg_price: z.number().describe("Minimum average price").optional(),
  max_avg_price: z.number().describe("Maximum average price").optional(),

  // Volume/OI ratio filters
  min_volume_oi_ratio: z.number().describe("Minimum volume/OI ratio").optional(),
  max_volume_oi_ratio: z.number().describe("Maximum volume/OI ratio").optional(),

  // Open interest filters
  min_open_interest: z.number().int().nonnegative().describe("Minimum open interest").optional(),
  max_open_interest: z.number().int().nonnegative().describe("Maximum open interest").optional(),

  // Floor volume filters
  min_floor_volume: z.number().int().nonnegative().describe("Minimum floor volume").optional(),
  max_floor_volume: z.number().int().nonnegative().describe("Maximum floor volume").optional(),

  // Volume > OI filter
  vol_greater_oi: z.boolean().describe("Filter for contracts where volume > OI").optional(),

  // Issue types
  "issue_types[]": z.array(z.string()).describe("Filter by issue types").optional(),

  // Ask/bid percentage filters
  min_ask_perc: z.number().describe("Minimum ask percentage").optional(),
  max_ask_perc: z.number().describe("Maximum ask percentage").optional(),
  min_bid_perc: z.number().describe("Minimum bid percentage").optional(),
  max_bid_perc: z.number().describe("Maximum bid percentage").optional(),

  // Skew percentage filters
  min_skew_perc: z.number().describe("Minimum skew percentage").optional(),
  max_skew_perc: z.number().describe("Maximum skew percentage").optional(),

  // Bull/bear percentage filters
  min_bull_perc: z.number().describe("Minimum bullish percentage").optional(),
  max_bull_perc: z.number().describe("Maximum bullish percentage").optional(),
  min_bear_perc: z.number().describe("Minimum bearish percentage").optional(),
  max_bear_perc: z.number().describe("Maximum bearish percentage").optional(),

  // 7-day bid/ask side percentage filters
  min_bid_side_perc_7_day: z.number().describe("Minimum 7-day bid side percentage").optional(),
  max_bid_side_perc_7_day: z.number().describe("Maximum 7-day bid side percentage").optional(),
  min_ask_side_perc_7_day: z.number().describe("Minimum 7-day ask side percentage").optional(),
  max_ask_side_perc_7_day: z.number().describe("Maximum 7-day ask side percentage").optional(),

  // Days of OI increases filters
  min_days_of_oi_increases: z.number().int().nonnegative().describe("Minimum days of OI increases").optional(),
  max_days_of_oi_increases: z.number().int().nonnegative().describe("Maximum days of OI increases").optional(),

  // Days of volume > OI filters
  min_days_of_vol_greater_than_oi: z.number().int().nonnegative().describe("Minimum days of volume > OI").optional(),
  max_days_of_vol_greater_than_oi: z.number().int().nonnegative().describe("Maximum days of volume > OI").optional(),

  // IV percentage filters
  min_iv_perc: z.number().describe("Minimum IV percentage").optional(),
  max_iv_perc: z.number().describe("Maximum IV percentage").optional(),

  // Greek filters
  min_delta: z.number().describe("Minimum delta").optional(),
  max_delta: z.number().describe("Maximum delta").optional(),
  min_gamma: z.number().describe("Minimum gamma").optional(),
  max_gamma: z.number().describe("Maximum gamma").optional(),
  min_theta: z.number().describe("Minimum theta").optional(),
  max_theta: z.number().describe("Maximum theta").optional(),
  min_vega: z.number().describe("Minimum vega").optional(),
  max_vega: z.number().describe("Maximum vega").optional(),

  // Return on capital filters
  min_return_on_capital_perc: z.number().describe("Minimum return on capital percentage").optional(),
  max_return_on_capital_perc: z.number().describe("Maximum return on capital percentage").optional(),

  // OI change filters
  min_oi_change_perc: z.number().describe("Minimum OI change percentage").optional(),
  max_oi_change_perc: z.number().describe("Maximum OI change percentage").optional(),
  min_oi_change: z.number().describe("Minimum OI change").optional(),
  max_oi_change: z.number().describe("Maximum OI change").optional(),

  // Volume/ticker volume ratio filters
  min_volume_ticker_vol_ratio: z.number().describe("Minimum volume/ticker volume ratio").optional(),
  max_volume_ticker_vol_ratio: z.number().describe("Maximum volume/ticker volume ratio").optional(),

  // Sweep volume ratio filters
  min_sweep_volume_ratio: z.number().describe("Minimum sweep volume ratio").optional(),
  max_sweep_volume_ratio: z.number().describe("Maximum sweep volume ratio").optional(),

  // From low/high percentage filters
  min_from_low_perc: z.number().describe("Minimum from low percentage").optional(),
  max_from_low_perc: z.number().describe("Maximum from low percentage").optional(),
  min_from_high_perc: z.number().describe("Minimum from high percentage").optional(),
  max_from_high_perc: z.number().describe("Maximum from high percentage").optional(),

  // Earnings DTE filters
  min_earnings_dte: z.number().int().describe("Minimum days to earnings").optional(),
  max_earnings_dte: z.number().int().describe("Maximum days to earnings").optional(),

  // Transactions filters
  min_transactions: z.number().int().nonnegative().describe("Minimum transactions").optional(),
  max_transactions: z.number().int().nonnegative().describe("Maximum transactions").optional(),

  // Close price filters
  min_close: z.number().describe("Minimum close price").optional(),
  max_close: z.number().describe("Maximum close price").optional(),

  // Date filter
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe("Filter by specific date").optional(),
})
