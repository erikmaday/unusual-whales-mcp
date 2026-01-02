import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const insiderTool = {
  name: "uw_insider",
  description: `Access UnusualWhales insider trading data including transactions and flow.

Available actions:
- transactions: Get insider transactions with filters
- sector_flow: Get aggregated insider flow for a sector (sector required)
- ticker_flow: Get aggregated insider flow for a ticker (ticker required)
- insiders: Get all insiders for a ticker (ticker required)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["transactions", "sector_flow", "ticker_flow", "insiders"],
      },
      ticker: {
        type: "string",
        description: "Ticker symbol",
      },
      sector: {
        type: "string",
        description: "Market sector",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
      page: {
        type: "number",
        description: "Page number for pagination",
      },
      min_value: {
        type: "number",
        description: "Minimum transaction value",
      },
      max_value: {
        type: "number",
        description: "Maximum transaction value",
      },
      min_price: {
        type: "number",
        description: "Minimum stock price",
      },
      max_price: {
        type: "number",
        description: "Maximum stock price",
      },
      owner_name: {
        type: "string",
        description: "Name of insider",
      },
      sectors: {
        type: "string",
        description: "Filter by sectors",
      },
      industries: {
        type: "string",
        description: "Filter by industries",
      },
      is_director: {
        type: "boolean",
        description: "Filter for directors",
      },
      is_officer: {
        type: "boolean",
        description: "Filter for officers",
      },
      is_ten_percent_owner: {
        type: "boolean",
        description: "Filter for 10% owners",
      },
      is_s_p_500: {
        type: "boolean",
        description: "Only S&P 500 companies",
      },
      transaction_codes: {
        type: "string",
        description: "Transaction codes (P=Purchase, S=Sale)",
      },
    },
    required: ["action"],
  },
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
  } = args

  switch (action) {
    case "transactions":
      return formatResponse(await uwFetch("/api/insider/transactions", {
        ticker_symbol: ticker as string,
        limit: limit as number,
        page: page as number,
        min_value: min_value as number,
        max_value: max_value as number,
        min_price: min_price as number,
        max_price: max_price as number,
        owner_name: owner_name as string,
        sectors: sectors as string,
        industries: industries as string,
        is_director: is_director as boolean,
        is_officer: is_officer as boolean,
        is_ten_percent_owner: is_ten_percent_owner as boolean,
        is_s_p_500: is_s_p_500 as boolean,
        "transaction_codes[]": transaction_codes as string,
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
