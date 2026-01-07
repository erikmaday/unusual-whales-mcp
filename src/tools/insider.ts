import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, limitSchema, formatZodError, insiderTransactionFiltersSchema,
} from "../schemas.js"

const insiderActions = ["transactions", "sector_flow", "ticker_flow", "insiders"] as const

const insiderInputSchema = z.object({
  action: z.enum(insiderActions).describe("The action to perform"),
  ticker: tickerSchema.optional(),
  sector: z.string().describe("Market sector").optional(),
  limit: limitSchema.optional(),
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
}).merge(insiderTransactionFiltersSchema)


export const insiderTool = {
  name: "uw_insider",
  description: `Access UnusualWhales insider trading data including transactions and flow.

Available actions:
- transactions: Get insider transactions with filters
- sector_flow: Get aggregated insider flow for a sector (sector required)
- ticker_flow: Get aggregated insider flow for a ticker (ticker required)
- insiders: Get all insiders for a ticker (ticker required)`,
  inputSchema: toJsonSchema(insiderInputSchema),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle insider tool requests.
 *
 * @param args - Tool arguments containing action and optional insider trade filters
 * @returns JSON string with insider trading data or error message
 */
export async function handleInsider(args: Record<string, unknown>): Promise<string> {
  const parsed = insiderInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const {
    action,
    ticker,
    sector,
    limit,
    page,
    min_value,
    max_value,
    min_price,
    max_price,
    owner_name,
    sectors,
    industries,
    is_director,
    is_officer,
    is_ten_percent_owner,
    is_s_p_500,
    transaction_codes,
    min_marketcap,
    max_marketcap,
    market_cap_size,
    min_earnings_dte,
    max_earnings_dte,
    min_amount,
    max_amount,
    common_stock_only,
    security_ad_codes,
  } = parsed.data

  switch (action) {
    case "transactions":
      return formatResponse(await uwFetch("/api/insider/transactions", {
        ticker_symbol: ticker,
        limit,
        page,
        min_value,
        max_value,
        min_price,
        max_price,
        owner_name,
        sectors,
        industries,
        is_director,
        is_officer,
        is_ten_percent_owner,
        is_s_p_500,
        "transaction_codes[]": transaction_codes,
        min_marketcap,
        max_marketcap,
        market_cap_size,
        min_earnings_dte,
        max_earnings_dte,
        min_amount,
        max_amount,
        common_stock_only,
        security_ad_codes,
      }))

    case "sector_flow":
      if (!sector) return formatError("sector is required")
      return formatResponse(await uwFetch(`/api/insider/${encodePath(sector)}/sector-flow`))

    case "ticker_flow":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/insider/${encodePath(ticker)}/ticker-flow`))

    case "insiders":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/insider/${encodePath(ticker)}`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
