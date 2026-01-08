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
