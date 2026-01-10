import { z } from "zod"

/** Insider transaction filters */
export const insiderTransactionFiltersSchema = z.object({
  // Market cap filters
  min_marketcap: z.number().int().min(0).describe("The minimum market capitalization in USD").optional(),
  max_marketcap: z.number().int().min(0).describe("The maximum market capitalization in USD").optional(),
  market_cap_size: z.string().describe("Filter by company market cap size category (small, mid, large)").optional(),

  // Earnings DTE filters
  min_earnings_dte: z.number().int().nonnegative("DTE cannot be negative").describe("The minimum number of days until the company's next earnings announcement").optional(),
  max_earnings_dte: z.number().int().nonnegative("DTE cannot be negative").describe("The maximum number of days until the company's next earnings announcement").optional(),

  // Share amount filters
  min_amount: z.number().int().nonnegative("Amount cannot be negative").describe("The minimum number of shares in the insider transaction").optional(),
  max_amount: z.number().int().nonnegative("Amount cannot be negative").describe("The maximum number of shares in the insider transaction").optional(),

  // Security type filters
  common_stock_only: z.boolean().describe("Only include transactions involving common stock (excludes options, warrants, etc.)").optional(),
  security_ad_codes: z.string().describe("Filter by security acquisition/disposition codes (A for acquisition, D for disposition)").optional(),
})
