import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas
const transactionsSchema = z.object({
  action: z.literal("transactions"),
  ticker_symbol: z.string().describe("Comma-separated list of ticker symbols for transactions action (e.g., AAPL,INTC). Prefix with - to exclude.").optional(),
  limit: z.number().int().min(1).max(500).default(500).optional(),
  page: z.number().describe("Page number for pagination").optional(),
  min_value: z.number().describe("Minimum transaction value").optional(),
  max_value: z.number().describe("Maximum transaction value").optional(),
  min_price: z.number().describe("Minimum stock price").optional(),
  max_price: z.number().describe("Maximum stock price").optional(),
  owner_name: z.string().describe("Name of insider").optional(),
  sectors: z.string().describe("Filter by sectors").optional(),
  industries: z.string().describe("Filter by industries").optional(),
  is_director: z.boolean().describe("Filter for directors").optional(),
  is_officer: z.boolean().describe("Filter for officers").optional(),
  is_ten_percent_owner: z.boolean().describe("Filter for 10% owners").optional(),
  is_s_p_500: z.boolean().describe("Only S&P 500 companies").optional(),
  transaction_codes: z.string().describe("Transaction codes (P=Purchase, S=Sale)").optional(),
  // From insiderTransactionFiltersSchema
  min_marketcap: z.number().int().min(0).describe("The minimum market capitalization in USD").optional(),
  max_marketcap: z.number().int().min(0).describe("The maximum market capitalization in USD").optional(),
  market_cap_size: z.string().describe("Filter by company market cap size category (small, mid, large)").optional(),
  min_earnings_dte: z.number().int().nonnegative().describe("The minimum number of days until the company's next earnings announcement").optional(),
  max_earnings_dte: z.number().int().nonnegative().describe("The maximum number of days until the company's next earnings announcement").optional(),
  min_amount: z.number().int().nonnegative().describe("The minimum number of shares in the insider transaction").optional(),
  max_amount: z.number().int().nonnegative().describe("The maximum number of shares in the insider transaction").optional(),
  common_stock_only: z.boolean().describe("Only include transactions involving common stock (excludes options, warrants, etc.)").optional(),
  security_ad_codes: z.string().describe("Filter by security acquisition/disposition codes (A for acquisition, D for disposition)").optional(),
})

const sectorFlowSchema = z.object({
  action: z.literal("sector_flow"),
  sector: z.string().describe("Market sector"),
})

const tickerFlowSchema = z.object({
  action: z.literal("ticker_flow"),
  ticker: tickerSchema.describe("Single stock ticker symbol for ticker_flow and insiders actions"),
})

const insidersSchema = z.object({
  action: z.literal("insiders"),
  ticker: tickerSchema.describe("Single stock ticker symbol for ticker_flow and insiders actions"),
})

// Discriminated union of all action schemas
const insiderInputSchema = z.discriminatedUnion("action", [
  transactionsSchema,
  sectorFlowSchema,
  tickerFlowSchema,
  insidersSchema,
])

export const insiderTool = {
  name: "uw_insider",
  description: `Access UnusualWhales insider trading data including transactions and flow.

Available actions:
- transactions: Get insider transactions with filters. Use ticker_symbol for comma-separated tickers (e.g., AAPL,INTC)
- sector_flow: Get aggregated insider flow for a sector (sector required)
- ticker_flow: Get aggregated insider flow for a ticker (ticker required)
- insiders: Get all insiders for a ticker (ticker required)`,
  inputSchema: toJsonSchema(insiderInputSchema),
  zodInputSchema: insiderInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle insider tool requests using the tool factory pattern
 */
export const handleInsider = createToolHandler(insiderInputSchema, {
  transactions: async (data) => {
    return uwFetch("/api/insider/transactions", {
      ticker_symbol: data.ticker_symbol,
      limit: data.limit,
      page: data.page,
      min_value: data.min_value,
      max_value: data.max_value,
      min_price: data.min_price,
      max_price: data.max_price,
      owner_name: data.owner_name,
      sectors: data.sectors,
      industries: data.industries,
      is_director: data.is_director,
      is_officer: data.is_officer,
      is_ten_percent_owner: data.is_ten_percent_owner,
      is_s_p_500: data.is_s_p_500,
      "transaction_codes[]": data.transaction_codes,
      min_marketcap: data.min_marketcap,
      max_marketcap: data.max_marketcap,
      market_cap_size: data.market_cap_size,
      min_earnings_dte: data.min_earnings_dte,
      max_earnings_dte: data.max_earnings_dte,
      min_amount: data.min_amount,
      max_amount: data.max_amount,
      common_stock_only: data.common_stock_only,
      security_ad_codes: data.security_ad_codes,
    })
  },

  sector_flow: async (data) => {
    const path = new PathParamBuilder()
      .add("sector", data.sector)
      .build("/api/insider/{sector}/sector-flow")
    return uwFetch(path)
  },

  ticker_flow: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/insider/{ticker}/ticker-flow")
    return uwFetch(path)
  },

  insiders: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/insider/{ticker}")
    return uwFetch(path)
  },
})
