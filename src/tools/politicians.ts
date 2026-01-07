import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, limitSchema, dateSchema, formatZodError,
} from "../schemas.js"

const politiciansActions = ["people", "portfolio", "recent_trades", "holders", "disclosures"] as const

const politiciansInputSchema = z.object({
  action: z.enum(politiciansActions).describe("The action to perform"),
  politician_id: z.string().describe("Politician ID (for portfolio, recent_trades, or disclosures action)").optional(),
  latest_only: z.boolean().describe("Return only most recent disclosure per politician (for disclosures action)").optional(),
  year: z.number().describe("Filter by disclosure year (for disclosures action)").optional(),
  ticker: tickerSchema.describe("Ticker symbol (for holders or recent_trades action)").optional(),
  limit: limitSchema.optional(),
  page: z.number().describe("Page number for pagination").optional(),
  aggregate_all_portfolios: z.boolean().describe("Aggregate all portfolios (for portfolio or holders action)").optional(),
  date: dateSchema.describe("Filter by date in YYYY-MM-DD format (for recent_trades action)").optional(),
  filter_late_reports: z.boolean().describe("Filter out late reports (for recent_trades action)").optional(),
  disclosure_newer_than: dateSchema.describe("Filter disclosures newer than date in YYYY-MM-DD format (for recent_trades action)").optional(),
  disclosure_older_than: dateSchema.describe("Filter disclosures older than date in YYYY-MM-DD format (for recent_trades action)").optional(),
  transaction_newer_than: dateSchema.describe("Filter transactions newer than date in YYYY-MM-DD format (for recent_trades action)").optional(),
  transaction_older_than: dateSchema.describe("Filter transactions older than date in YYYY-MM-DD format (for recent_trades action)").optional(),
})


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
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle politicians tool requests.
 *
 * @param args - Tool arguments containing action and optional politician parameters
 * @returns JSON string with politician portfolio data or error message
 */
export async function handlePoliticians(args: Record<string, unknown>): Promise<string> {
  const parsed = politiciansInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const {
    action, politician_id, ticker, limit, page, latest_only, year,
    aggregate_all_portfolios, date, filter_late_reports,
    disclosure_newer_than, disclosure_older_than,
    transaction_newer_than, transaction_older_than,
  } = parsed.data

  switch (action) {
    case "people":
      return formatResponse(await uwFetch("/api/politician-portfolios/people"))

    case "portfolio":
      if (!politician_id) return formatError("politician_id is required")
      return formatResponse(await uwFetch(`/api/politician-portfolios/${encodePath(politician_id)}`, {
        aggregate_all_portfolios,
      }))

    case "recent_trades":
      return formatResponse(await uwFetch("/api/politician-portfolios/recent_trades", {
        limit,
        page,
        date,
        ticker,
        politician_id,
        filter_late_reports,
        disclosure_newer_than,
        disclosure_older_than,
        transaction_newer_than,
        transaction_older_than,
      }))

    case "holders":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/politician-portfolios/holders/${encodePath(ticker)}`, {
        aggregate_all_portfolios,
      }))

    case "disclosures":
      return formatResponse(await uwFetch("/api/politician-portfolios/disclosures", {
        politician_id,
        latest_only,
        year,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
