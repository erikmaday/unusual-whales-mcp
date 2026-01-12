import { z } from "zod"

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
