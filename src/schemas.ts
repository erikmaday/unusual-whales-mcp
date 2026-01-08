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
  "issue_types[]": z.array(z.string()).describe("Filter by issue types (e.g., Common Stock, ETF, ADR)").optional(),
  "sectors[]": z.array(z.string()).describe("Filter by market sectors").optional(),

  // Price change filters
  min_change: z.number().describe("Minimum % change to the previous trading day").optional(),
  max_change: z.number().describe("Maximum % change to the previous trading day").optional(),

  // Underlying price filters
  min_underlying_price: z.number().describe("Minimum stock price").optional(),
  max_underlying_price: z.number().describe("Maximum stock price").optional(),

  // Boolean filters
  is_s_p_500: z.boolean().describe("Only include stocks which are part of the S&P 500 (setting to false has no effect)").optional(),
  has_dividends: z.boolean().describe("Only include stocks which pay dividends (setting to false has no effect)").optional(),

  // 3-day percentage filters
  min_perc_3_day_total: z.number().describe("Minimum ratio of options volume vs 3 day avg options volume").optional(),
  max_perc_3_day_total: z.number().describe("Maximum ratio of options volume vs 3 day avg options volume").optional(),
  min_perc_3_day_call: z.number().describe("Minimum ratio of call options volume vs 3 day avg call options volume").optional(),
  max_perc_3_day_call: z.number().describe("Maximum ratio of call options volume vs 3 day avg call options volume").optional(),
  min_perc_3_day_put: z.number().describe("Minimum ratio of put options volume vs 3 day avg put options volume").optional(),
  max_perc_3_day_put: z.number().describe("Maximum ratio of put options volume vs 3 day avg put options volume").optional(),

  // 30-day percentage filters
  min_perc_30_day_total: z.number().describe("Minimum ratio of options volume vs 30 day avg options volume").optional(),
  max_perc_30_day_total: z.number().describe("Maximum ratio of options volume vs 30 day avg options volume").optional(),
  min_perc_30_day_call: z.number().describe("Minimum ratio of call options volume vs 30 day avg call options volume").optional(),
  max_perc_30_day_call: z.number().describe("Maximum ratio of call options volume vs 30 day avg call options volume").optional(),
  min_perc_30_day_put: z.number().describe("Minimum ratio of put options volume vs 30 day avg put options volume").optional(),
  max_perc_30_day_put: z.number().describe("Maximum ratio of put options volume vs 30 day avg put options volume").optional(),

  // OI change percentage filters
  min_total_oi_change_perc: z.number().describe("Minimum open interest change compared to the previous day").optional(),
  max_total_oi_change_perc: z.number().describe("Maximum open interest change compared to the previous day").optional(),
  min_call_oi_change_perc: z.number().describe("Minimum open interest change of call contracts compared to the previous day").optional(),
  max_call_oi_change_perc: z.number().describe("Maximum open interest change of call contracts compared to the previous day").optional(),
  min_put_oi_change_perc: z.number().describe("Minimum open interest change of put contracts compared to the previous day").optional(),
  max_put_oi_change_perc: z.number().describe("Maximum open interest change of put contracts compared to the previous day").optional(),

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
  min_call_volume: z.number().int().nonnegative().describe("Minimum call options volume").optional(),
  max_call_volume: z.number().int().nonnegative().describe("Maximum call options volume").optional(),
  min_put_volume: z.number().int().nonnegative().describe("Minimum put options volume").optional(),
  max_put_volume: z.number().int().nonnegative().describe("Maximum put options volume").optional(),

  // Call/put premium filters
  min_call_premium: z.number().describe("Minimum call options premium").optional(),
  max_call_premium: z.number().describe("Maximum call options premium").optional(),
  min_put_premium: z.number().describe("Minimum put options premium").optional(),
  max_put_premium: z.number().describe("Maximum put options premium").optional(),

  // Net premium filters
  min_net_premium: z.number().describe("Minimum net options premium").optional(),
  max_net_premium: z.number().describe("Maximum net options premium").optional(),
  min_net_call_premium: z.number().describe("Minimum net call options premium").optional(),
  max_net_call_premium: z.number().describe("Maximum net call options premium").optional(),
  min_net_put_premium: z.number().describe("Minimum net put options premium").optional(),
  max_net_put_premium: z.number().describe("Maximum net put options premium").optional(),

  // OI vs volume filters
  min_oi_vs_vol: z.number().describe("Minimum open interest vs options volume ratio").optional(),
  max_oi_vs_vol: z.number().describe("Maximum open interest vs options volume ratio").optional(),

  // Put/call ratio filters
  min_put_call_ratio: z.number().describe("Minimum put to call ratio").optional(),
  max_put_call_ratio: z.number().describe("Maximum put to call ratio").optional(),

  // Stock volume vs avg filters
  min_stock_volume_vs_avg30_volume: z.number().describe("Minimum stock volume vs average 30 day volume").optional(),
  max_avg30_volume: z.number().describe("Maximum stock volume vs average 30 day volume").optional(),

  // Date filter
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe("Filter by specific date (YYYY-MM-DD)").optional(),
})

// ============================================================================
// Option contract screener filter schemas
// ============================================================================

export const optionContractScreenerFiltersSchema = z.object({
  // Ticker and sector filters
  ticker_symbol: z.string().describe("Filter by ticker symbol").optional(),
  "sectors[]": z.array(z.string()).describe("Filter by market sectors").optional(),

  // Underlying price filters
  min_underlying_price: z.number().describe("Minimum stock price").optional(),
  max_underlying_price: z.number().describe("Maximum stock price").optional(),

  // Ex-div filter
  exclude_ex_div_ticker: z.boolean().describe("Exclude tickers trading ex-dividend today (useful to filter out dividend arbitrage ITM call flow)").optional(),

  // Diff filters
  min_diff: z.number().describe("Minimum OTM diff of a contract").optional(),
  max_diff: z.number().describe("Maximum OTM diff of a contract").optional(),

  // Strike filters
  min_strike: z.number().describe("Minimum strike price").optional(),
  max_strike: z.number().describe("Maximum strike price").optional(),

  // Option type
  type: z.enum(["call", "put"]).describe("Option type filter (call or put)").optional(),

  // Expiry dates
  "expiry_dates[]": z.array(z.string()).describe("Filter by specific expiry dates").optional(),

  // Market cap filters
  min_marketcap: z.number().describe("Minimum market cap").optional(),
  max_marketcap: z.number().describe("Maximum market cap").optional(),

  // Volume filters
  min_volume: z.number().int().nonnegative().describe("Minimum volume on that contract").optional(),
  max_volume: z.number().int().nonnegative().describe("Maximum volume on that contract").optional(),

  // 30-day average volume filters
  min_ticker_30_d_avg_volume: z.number().describe("Minimum 30-day average stock volume for the underlying ticker").optional(),
  max_ticker_30_d_avg_volume: z.number().describe("Maximum 30-day average stock volume for the underlying ticker").optional(),
  min_contract_30_d_avg_volume: z.number().describe("Minimum 30-day average options contract volume for the underlying ticker").optional(),
  max_contract_30_d_avg_volume: z.number().describe("Maximum 30-day average options contract volume for the underlying ticker").optional(),

  // Multileg volume ratio filters
  min_multileg_volume_ratio: z.number().describe("Minimum multi leg volume to contract volume ratio").optional(),
  max_multileg_volume_ratio: z.number().describe("Maximum multi leg volume to contract volume ratio").optional(),

  // Floor volume ratio filters
  min_floor_volume_ratio: z.number().describe("Minimum floor volume to contract volume ratio").optional(),
  max_floor_volume_ratio: z.number().describe("Maximum floor volume to contract volume ratio").optional(),

  // Percentage change filters
  min_perc_change: z.number().describe("Minimum % price change of the contract to the previous day (-1.00 to +inf)").optional(),
  max_perc_change: z.number().describe("Maximum % price change of the contract to the previous day (-1.00 to +inf)").optional(),
  min_daily_perc_change: z.number().describe("Minimum intraday price change of the contract from open till now").optional(),
  max_daily_perc_change: z.number().describe("Maximum intraday price change for the contract since market open").optional(),

  // Average price filters
  min_avg_price: z.number().describe("Minimum average price of the contract").optional(),
  max_avg_price: z.number().describe("Maximum average price of the contract").optional(),

  // Volume/OI ratio filters
  min_volume_oi_ratio: z.number().describe("Minimum contract volume to open interest ratio").optional(),
  max_volume_oi_ratio: z.number().describe("Maximum contract volume to open interest ratio").optional(),

  // Open interest filters
  min_open_interest: z.number().int().nonnegative().describe("Minimum open interest on that contract").optional(),
  max_open_interest: z.number().int().nonnegative().describe("Maximum open interest on that contract").optional(),

  // Floor volume filters
  min_floor_volume: z.number().int().nonnegative().describe("Minimum floor volume on that contract").optional(),
  max_floor_volume: z.number().int().nonnegative().describe("Maximum floor volume on that contract").optional(),

  // Volume > OI filter
  vol_greater_oi: z.boolean().describe("Only include contracts where volume is greater than open interest").optional(),

  // Issue types
  "issue_types[]": z.array(z.string()).describe("Filter by issue types (e.g., Common Stock, ETF, ADR)").optional(),

  // Ask/bid percentage filters
  min_ask_perc: z.number().describe("Minimum ask percentage of volume that transacted on the ask").optional(),
  max_ask_perc: z.number().describe("Maximum ask percentage of volume that transacted on the ask").optional(),
  min_bid_perc: z.number().describe("Minimum bid percentage of volume that transacted on the bid").optional(),
  max_bid_perc: z.number().describe("Maximum bid percentage of volume that transacted on the bid").optional(),

  // Skew percentage filters
  min_skew_perc: z.number().describe("Minimum skew percentage (e.g., 0.8 returns contracts where 80%+ of vol transacted on ask or bid side)").optional(),
  max_skew_perc: z.number().describe("Maximum skew percentage (e.g., 0.8 returns contracts where max 80% of vol transacted on ask or bid side)").optional(),

  // Bull/bear percentage filters
  min_bull_perc: z.number().describe("Minimum bull percentage").optional(),
  max_bull_perc: z.number().describe("Maximum bull percentage").optional(),
  min_bear_perc: z.number().describe("Minimum bear percentage").optional(),
  max_bear_perc: z.number().describe("Maximum bear percentage").optional(),

  // 7-day bid/ask side percentage filters
  min_bid_side_perc_7_day: z.number().describe("Minimum percentage of days over last 7 days where contract traded primarily on the bid side").optional(),
  max_bid_side_perc_7_day: z.number().describe("Maximum percentage of days over last 7 days where contract traded primarily on the bid side").optional(),
  min_ask_side_perc_7_day: z.number().describe("Minimum percentage of days over last 7 days where contract traded primarily on the ask side").optional(),
  max_ask_side_perc_7_day: z.number().describe("Maximum percentage of days over last 7 days where contract traded primarily on the ask side").optional(),

  // Days of OI increases filters
  min_days_of_oi_increases: z.number().int().nonnegative().describe("Minimum days of consecutive trading days where open interest increased").optional(),
  max_days_of_oi_increases: z.number().int().nonnegative().describe("Maximum days of consecutive trading days where open interest increased").optional(),

  // Days of volume > OI filters
  min_days_of_vol_greater_than_oi: z.number().int().nonnegative().describe("Minimum days of consecutive days where volume was greater than open interest").optional(),
  max_days_of_vol_greater_than_oi: z.number().int().nonnegative().describe("Maximum days of consecutive days where volume was greater than open interest").optional(),

  // IV percentage filters
  min_iv_perc: z.number().describe("Minimum implied volatility percentage").optional(),
  max_iv_perc: z.number().describe("Maximum implied volatility percentage").optional(),

  // Greek filters
  min_delta: z.number().describe("Minimum delta (-1.00 to +1.00)").optional(),
  max_delta: z.number().describe("Maximum delta (-1.00 to +1.00)").optional(),
  min_gamma: z.number().describe("Minimum gamma (0.00 to +inf)").optional(),
  max_gamma: z.number().describe("Maximum gamma (0.00 to +inf)").optional(),
  min_theta: z.number().describe("Minimum theta (-inf to 0.00)").optional(),
  max_theta: z.number().describe("Maximum theta (-inf to 0.00)").optional(),
  min_vega: z.number().describe("Minimum vega (0.00 to +inf)").optional(),
  max_vega: z.number().describe("Maximum vega (0.00 to +inf)").optional(),

  // Return on capital filters
  min_return_on_capital_perc: z.number().describe("Minimum return on capital percentage (ROC)").optional(),
  max_return_on_capital_perc: z.number().describe("Maximum return on capital percentage (ROC)").optional(),

  // OI change filters
  min_oi_change_perc: z.number().describe("Minimum open interest change percentage (-1.00 to +inf)").optional(),
  max_oi_change_perc: z.number().describe("Maximum open interest change percentage (-1.00 to +inf)").optional(),
  min_oi_change: z.number().describe("Minimum open interest change as an absolute change").optional(),
  max_oi_change: z.number().describe("Maximum open interest change as an absolute change").optional(),

  // Volume/ticker volume ratio filters
  min_volume_ticker_vol_ratio: z.number().describe("Minimum ratio of contract volume to total option volume of the underlying (0.00 to 1.00)").optional(),
  max_volume_ticker_vol_ratio: z.number().describe("Maximum ratio of contract volume to total option volume of the underlying (0.00 to 1.00)").optional(),

  // Sweep volume ratio filters
  min_sweep_volume_ratio: z.number().describe("Minimum sweep volume ratio (0.00 to 1.00)").optional(),
  max_sweep_volume_ratio: z.number().describe("Maximum sweep volume ratio (0.00 to 1.00)").optional(),

  // From low/high percentage filters
  min_from_low_perc: z.number().describe("Minimum percentage change of current price from today's low (-1.00 to +inf)").optional(),
  max_from_low_perc: z.number().describe("Maximum percentage change of current price from today's low (-1.00 to +inf)").optional(),
  min_from_high_perc: z.number().describe("Minimum percentage change of current price from today's high (-1.00 to +inf)").optional(),
  max_from_high_perc: z.number().describe("Maximum percentage change of current price from today's high (-1.00 to +inf)").optional(),

  // Earnings DTE filters
  min_earnings_dte: z.number().int().describe("Minimum days to earnings").optional(),
  max_earnings_dte: z.number().int().describe("Maximum days to earnings").optional(),

  // Transactions filters
  min_transactions: z.number().int().nonnegative().describe("Minimum number of transactions").optional(),
  max_transactions: z.number().int().nonnegative().describe("Maximum number of transactions").optional(),

  // Close price filters
  min_close: z.number().describe("Minimum contract price (not underlying price)").optional(),
  max_close: z.number().describe("Maximum contract price (not underlying price)").optional(),

  // Date filter
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe("Filter by specific date (YYYY-MM-DD)").optional(),
})
