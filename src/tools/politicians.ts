import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas
const peopleSchema = z.object({
  action: z.literal("people"),
})

const portfolioSchema = z.object({
  action: z.literal("portfolio"),
  politician_id: z.uuid().describe("Politician ID (for portfolio, recent_trades, or disclosures action)"),
  aggregate_all_portfolios: z.boolean().describe("Aggregate all portfolios (for portfolio or holders action)").optional(),
})

const recentTradesSchema = z.object({
  action: z.literal("recent_trades"),
  politician_id: z.uuid().describe("Politician ID (for portfolio, recent_trades, or disclosures action)").optional(),
  ticker: tickerSchema.describe("Ticker symbol (for holders or recent_trades action)").optional(),
  limit: z.number().int().min(1).max(500).default(500).describe("Maximum number of results").optional(),
  page: z.number().describe("Page number for pagination").optional(),
  date: dateSchema.describe("Filter by date in YYYY-MM-DD format (for recent_trades action)").optional(),
  filter_late_reports: z.boolean().default(false).describe("Filter out late reports (for recent_trades action)").optional(),
  disclosure_newer_than: dateSchema.describe("Filter disclosures newer than date in YYYY-MM-DD format (for recent_trades action)").optional(),
  disclosure_older_than: dateSchema.describe("Filter disclosures older than date in YYYY-MM-DD format (for recent_trades action)").optional(),
  transaction_newer_than: dateSchema.describe("Filter transactions newer than date in YYYY-MM-DD format (for recent_trades action)").optional(),
  transaction_older_than: dateSchema.describe("Filter transactions older than date in YYYY-MM-DD format (for recent_trades action)").optional(),
})

const holdersSchema = z.object({
  action: z.literal("holders"),
  ticker: tickerSchema.describe("Ticker symbol (for holders or recent_trades action)"),
  aggregate_all_portfolios: z.boolean().describe("Aggregate all portfolios (for portfolio or holders action)").optional(),
})

const disclosuresSchema = z.object({
  action: z.literal("disclosures"),
  politician_id: z.uuid().describe("Politician ID (for portfolio, recent_trades, or disclosures action)").optional(),
  latest_only: z.boolean().describe("Return only most recent disclosure per politician (for disclosures action)").optional(),
  year: z.number().describe("Filter by disclosure year (for disclosures action)").optional(),
})

// Discriminated union of all action schemas
const politiciansInputSchema = z.discriminatedUnion("action", [
  peopleSchema,
  portfolioSchema,
  recentTradesSchema,
  holdersSchema,
  disclosuresSchema,
])

export const politiciansTool = {
  name: "uw_politicians",
  description: `Access UnusualWhales politician portfolio and trading data.

Available actions:
- people: List all politicians
- portfolio: Get a politician's portfolio (politician_id required; optional: aggregate_all_portfolios)
- recent_trades: Get recent politician trades (optional: date, ticker, politician_id, filter_late_reports, disclosure_newer_than, disclosure_older_than, transaction_newer_than, transaction_older_than)
- holders: Get politicians holding a ticker (ticker required; optional: aggregate_all_portfolios)
- disclosures: Get annual disclosure file records (optional: politician_id, latest_only, year)`,
  inputSchema: toJsonSchema(politiciansInputSchema),
  zodInputSchema: politiciansInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle politicians tool requests using the tool factory pattern
 */
export const handlePoliticians = createToolHandler(politiciansInputSchema, {
  people: async () => {
    return uwFetch("/api/politician-portfolios/people")
  },

  portfolio: async (data) => {
    const path = new PathParamBuilder()
      .add("politician_id", data.politician_id)
      .build("/api/politician-portfolios/{politician_id}")
    return uwFetch(path, {
      aggregate_all_portfolios: data.aggregate_all_portfolios,
    })
  },

  recent_trades: async (data) => {
    return uwFetch("/api/politician-portfolios/recent_trades", {
      limit: data.limit,
      page: data.page,
      date: data.date,
      ticker: data.ticker,
      politician_id: data.politician_id,
      filter_late_reports: data.filter_late_reports,
      disclosure_newer_than: data.disclosure_newer_than,
      disclosure_older_than: data.disclosure_older_than,
      transaction_newer_than: data.transaction_newer_than,
      transaction_older_than: data.transaction_older_than,
    })
  },

  holders: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/politician-portfolios/holders/{ticker}")
    return uwFetch(path, {
      aggregate_all_portfolios: data.aggregate_all_portfolios,
    })
  },

  disclosures: async (data) => {
    return uwFetch("/api/politician-portfolios/disclosures", {
      politician_id: data.politician_id,
      latest_only: data.latest_only,
      year: data.year,
    })
  },
})
