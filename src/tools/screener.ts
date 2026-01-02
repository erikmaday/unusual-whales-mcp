import { uwFetch, formatResponse, formatError } from "../client.js"

export const screenerTool = {
  name: "uw_screener",
  description: `Access UnusualWhales screeners for stocks, options, and analysts.

Available actions:
- stocks: Screen stocks with various filters
- option_contracts: Screen option contracts with filters
- analysts: Screen analyst ratings`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["stocks", "option_contracts", "analysts"],
      },
      ticker: {
        type: "string",
        description: "Ticker symbol filter",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
      page: {
        type: "number",
        description: "Page number for pagination",
      },
      order: {
        type: "string",
        description: "Order by field",
      },
      order_direction: {
        type: "string",
        description: "Order direction",
        enum: ["asc", "desc"],
      },
      // Stock screener filters
      sector: {
        type: "string",
        description: "Market sector filter",
      },
      min_marketcap: {
        type: "number",
        description: "Minimum market cap",
      },
      max_marketcap: {
        type: "number",
        description: "Maximum market cap",
      },
      min_price: {
        type: "number",
        description: "Minimum stock price",
      },
      max_price: {
        type: "number",
        description: "Maximum stock price",
      },
      min_volume: {
        type: "number",
        description: "Minimum volume",
      },
      max_volume: {
        type: "number",
        description: "Maximum volume",
      },
      // Option contract screener filters
      expiry: {
        type: "string",
        description: "Option expiry date",
      },
      min_dte: {
        type: "number",
        description: "Minimum days to expiration",
      },
      max_dte: {
        type: "number",
        description: "Maximum days to expiration",
      },
      min_premium: {
        type: "number",
        description: "Minimum premium",
      },
      max_premium: {
        type: "number",
        description: "Maximum premium",
      },
      min_oi: {
        type: "number",
        description: "Minimum open interest",
      },
      max_oi: {
        type: "number",
        description: "Maximum open interest",
      },
      option_type: {
        type: "string",
        description: "Option type (call or put)",
        enum: ["call", "put"],
      },
      is_otm: {
        type: "boolean",
        description: "Filter for OTM options",
      },
      // Analyst screener filters
      recommendation: {
        type: "string",
        description: "Analyst recommendation (buy, hold, sell)",
        enum: ["buy", "hold", "sell"],
      },
      analyst_action: {
        type: "string",
        description: "Analyst action type",
        enum: ["initiated", "reiterated", "downgraded", "upgraded", "maintained"],
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
 * Handle screener tool requests.
 *
 * @param args - Tool arguments containing action and optional screener filters
 * @returns JSON string with screener results or error message
 */
export async function handleScreener(args: Record<string, unknown>): Promise<string> {
  const {
    action,
    ticker,
    limit,
    page,
    order,
    order_direction,
    sector,
    min_marketcap,
    max_marketcap,
    min_price,
    max_price,
    min_volume,
    max_volume,
    expiry,
    min_dte,
    max_dte,
    min_premium,
    max_premium,
    min_oi,
    max_oi,
    option_type,
    is_otm,
    recommendation,
    analyst_action,
  } = args

  switch (action) {
    case "stocks":
      return formatResponse(await uwFetch("/api/screener/stocks", {
        ticker: ticker as string,
        sector: sector as string,
        min_marketcap: min_marketcap as number,
        max_marketcap: max_marketcap as number,
        min_price: min_price as number,
        max_price: max_price as number,
        min_volume: min_volume as number,
        max_volume: max_volume as number,
        order: order as string,
        order_direction: order_direction as string,
        limit: limit as number,
        page: page as number,
      }))

    case "option_contracts":
      return formatResponse(await uwFetch("/api/screener/option-contracts", {
        ticker: ticker as string,
        expiry: expiry as string,
        min_dte: min_dte as number,
        max_dte: max_dte as number,
        min_premium: min_premium as number,
        max_premium: max_premium as number,
        min_oi: min_oi as number,
        max_oi: max_oi as number,
        option_type: option_type as string,
        is_otm: is_otm as boolean,
        order: order as string,
        order_direction: order_direction as string,
        limit: limit as number,
        page: page as number,
      }))

    case "analysts":
      return formatResponse(await uwFetch("/api/screener/analysts", {
        ticker: ticker as string,
        recommendation: recommendation as string,
        action: analyst_action as string,
        order: order as string,
        order_direction: order_direction as string,
        limit: limit as number,
        page: page as number,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
