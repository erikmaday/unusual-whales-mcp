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

/** Delta value for risk reversal skew (10 or 25) */
export const deltaSchema = z.enum(["10", "25"]).describe("Delta value for risk reversal skew (10 or 25, representing 0.10 or 0.25)")
