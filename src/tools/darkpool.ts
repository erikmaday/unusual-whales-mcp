import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  dateSchema,
  limitSchema,
  premiumFilterSchema,
  sizeFilterSchema,
  volumeFilterSchema,
  formatZodError,
} from "../schemas/index.js"

const darkpoolActions = ["recent", "ticker"] as const

const darkpoolInputSchema = z.object({
  action: z.enum(darkpoolActions).describe("The action to perform"),
  ticker: tickerSchema.describe("Ticker symbol (required for ticker action)").optional(),
  date: dateSchema.optional(),
  limit: limitSchema.optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
  older_than: z.string().describe("Filter trades older than timestamp").optional(),
}).merge(premiumFilterSchema)
  .merge(sizeFilterSchema)
  .merge(volumeFilterSchema)


export const darkpoolTool = {
  name: "uw_darkpool",
  description: `Access UnusualWhales darkpool trade data.

Available actions:
- recent: Get recent darkpool trades across the market
- ticker: Get darkpool trades for a specific ticker

Filtering options include premium range, size range, and volume range.`,
  inputSchema: toJsonSchema(darkpoolInputSchema),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle darkpool tool requests.
 *
 * @param args - Tool arguments containing action and optional darkpool filters
 * @returns JSON string with darkpool data or error message
 */
export async function handleDarkpool(args: Record<string, unknown>): Promise<string> {
  const parsed = darkpoolInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const {
    action,
    ticker,
    date,
    limit,
    min_premium,
    max_premium,
    min_size,
    max_size,
    min_volume,
    max_volume,
    newer_than,
    older_than,
  } = parsed.data

  switch (action) {
    case "recent":
      return formatResponse(await uwFetch("/api/darkpool/recent", {
        date,
        limit,
        min_premium,
        max_premium,
        min_size,
        max_size,
        min_volume,
        max_volume,
      }))

    case "ticker":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/darkpool/${encodePath(ticker)}`, {
        date,
        limit,
        min_premium,
        max_premium,
        min_size,
        max_size,
        min_volume,
        max_volume,
        newer_than,
        older_than,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
