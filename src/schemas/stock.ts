import { z } from "zod"

/** Option contract filters for stock tool */
export const optionContractFiltersSchema = z.object({
  vol_greater_oi: z.boolean().describe("Only include contracts where volume is greater than open interest").optional(),
  exclude_zero_vol_chains: z.boolean().describe("Whether to only return chains where volume is greater than zero").optional(),
  exclude_zero_dte: z.boolean().describe("Whether to exclude contracts with zero days to expiration").optional(),
  exclude_zero_oi_chains: z.boolean().describe("Whether to only return chains where open interest is greater than zero").optional(),
  maybe_otm_only: z.boolean().describe("Only include contracts which are out of the money").optional(),
  option_symbol: z.string().describe("Filter by a specific option contract symbol (e.g., AAPL240119C00190000)").optional(),
})

/** Stock flow filters */
export const stockFlowFiltersSchema = z.object({
  is_ask_side: z.boolean().describe("Boolean flag whether a transaction is ask side").optional(),
  is_bid_side: z.boolean().describe("Boolean flag whether a transaction is bid side").optional(),
  side: z.string().describe("Filter by trade side (e.g., 'ask', 'bid', 'mid')").optional(),
  min_premium: z.number().nonnegative("Premium cannot be negative").describe("The minimum premium on the trade").optional(),
  filter: z.string().describe("Filter type for intraday flow (e.g., 'NetPremium', 'Volume', 'Trades')").optional(),
})

// ============================================================================
// Output Schemas
// ============================================================================

/**
 * Stock information output schema for the 'info' action.
 */
export const stockInfoOutputSchema = z.object({
  ticker: z.string().describe("Stock ticker symbol"),
  name: z.string().describe("Company name"),
  sector: z.string().optional().describe("Market sector"),
  industry: z.string().optional().describe("Industry category"),
  market_cap: z.number().optional().describe("Market capitalization"),
  price: z.number().optional().describe("Current stock price"),
  volume: z.number().optional().describe("Trading volume"),
  avg_volume: z.number().optional().describe("Average trading volume"),
  description: z.string().optional().describe("Company description"),
})

/**
 * OHLC candle data output schema.
 */
export const ohlcOutputSchema = z.array(z.object({
  timestamp: z.union([z.string(), z.number()]).describe("Timestamp of the candle"),
  open: z.number().describe("Opening price"),
  high: z.number().describe("Highest price"),
  low: z.number().describe("Lowest price"),
  close: z.number().describe("Closing price"),
  volume: z.number().optional().describe("Trading volume"),
}))

/**
 * Option contract output schema.
 */
export const optionContractOutputSchema = z.object({
  symbol: z.string().describe("Option contract symbol"),
  ticker: z.string().describe("Underlying ticker"),
  expiry: z.string().describe("Expiration date"),
  strike: z.number().describe("Strike price"),
  option_type: z.enum(["call", "put"]).describe("Option type"),
  bid: z.number().optional().describe("Bid price"),
  ask: z.number().optional().describe("Ask price"),
  last: z.number().optional().describe("Last traded price"),
  volume: z.number().optional().describe("Trading volume"),
  open_interest: z.number().optional().describe("Open interest"),
  implied_volatility: z.number().optional().describe("Implied volatility"),
})

/**
 * Greeks data output schema.
 */
export const greeksOutputSchema = z.object({
  delta: z.number().optional().describe("Delta greek"),
  gamma: z.number().optional().describe("Gamma greek"),
  theta: z.number().optional().describe("Theta greek"),
  vega: z.number().optional().describe("Vega greek"),
  rho: z.number().optional().describe("Rho greek"),
})

/**
 * Generic array output schema for list-based endpoints.
 */
export const arrayOutputSchema = z.array(z.unknown())

/**
 * Generic object output schema for object-based endpoints.
 */
export const objectOutputSchema = z.record(z.string(), z.unknown())

/**
 * Union of all possible stock tool output types.
 * This allows the tool to return different structured types based on the action.
 */
export const stockOutputSchema = z.union([
  stockInfoOutputSchema,
  ohlcOutputSchema,
  z.array(optionContractOutputSchema),
  greeksOutputSchema,
  arrayOutputSchema,
  objectOutputSchema,
])
