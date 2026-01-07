import { z } from "zod"
import { uwFetch, formatResponse, formatError } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  expirySchema,
  limitSchema,
  optionTypeSchema,
  orderSchema,
  premiumFilterSchema,
  oiFilterSchema,
  dteFilterSchema,
  volumeFilterSchema,
  formatZodError,
} from "../schemas.js"

const screenerActions = ["stocks", "option_contracts", "analysts"] as const

const screenerInputSchema = z.object({
  action: z.enum(screenerActions).describe("The action to perform"),
  ticker: tickerSchema.optional(),
  limit: limitSchema.optional(),
  page: z.number().describe("Page number for pagination").optional(),
  order: z.string().describe("Order by field").optional(),
  order_direction: orderSchema.describe("Order direction").optional(),
  // Stock screener filters
  sector: z.string().describe("Market sector filter").optional(),
  min_marketcap: z.number().describe("Minimum market cap").optional(),
  max_marketcap: z.number().describe("Maximum market cap").optional(),
  min_price: z.number().describe("Minimum stock price").optional(),
  max_price: z.number().describe("Maximum stock price").optional(),
  // Option contract screener filters
  expiry: expirySchema.optional(),
  option_type: optionTypeSchema.optional(),
  is_otm: z.boolean().describe("Filter for OTM options").optional(),
  // Analyst screener filters
  recommendation: z.enum(["buy", "hold", "sell"]).describe("Analyst recommendation (buy, hold, sell)").optional(),
  analyst_action: z.enum(["initiated", "reiterated", "downgraded", "upgraded", "maintained"]).describe("Analyst action type").optional(),
}).merge(premiumFilterSchema)
  .merge(oiFilterSchema)
  .merge(dteFilterSchema)
  .merge(volumeFilterSchema)


export const screenerTool = {
  name: "uw_screener",
  description: `Access UnusualWhales screeners for stocks, options, and analysts.

Available actions:
- stocks: Screen stocks with various filters
- option_contracts: Screen option contracts with filters
- analysts: Screen analyst ratings`,
  inputSchema: toJsonSchema(screenerInputSchema),
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
  const parsed = screenerInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

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
  } = parsed.data

  switch (action) {
    case "stocks":
      return formatResponse(await uwFetch("/api/screener/stocks", {
        ticker,
        sector,
        min_marketcap,
        max_marketcap,
        min_price,
        max_price,
        min_volume,
        max_volume,
        order,
        order_direction,
        limit,
        page,
      }))

    case "option_contracts":
      return formatResponse(await uwFetch("/api/screener/option-contracts", {
        ticker,
        expiry,
        min_dte,
        max_dte,
        min_premium,
        max_premium,
        min_oi,
        max_oi,
        option_type,
        is_otm,
        order,
        order_direction,
        limit,
        page,
      }))

    case "analysts":
      return formatResponse(await uwFetch("/api/screener/analysts", {
        ticker,
        recommendation,
        action: analyst_action,
        order,
        order_direction,
        limit,
        page,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
