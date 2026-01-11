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

// Base schema with common fields
const baseDarkpoolSchema = z.object({
  date: dateSchema.optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
  older_than: z.string().describe("Filter trades older than timestamp").optional(),
  min_premium: z.number().int().nonnegative("Premium cannot be negative").default(0).describe("The minimum premium on the alert or trade").optional(),
  max_premium: z.number().int().nonnegative("Premium cannot be negative").describe("The maximum premium on the alert or trade").optional(),
  min_size: z.number().int().nonnegative("Size cannot be negative").default(0).describe("The minimum size on that alert. Size is defined as the sum of the sizes of all transactions that make up the alert").optional(),
  max_size: z.number().int().nonnegative("Size cannot be negative").describe("The maximum size on that alert").optional(),
  min_volume: z.number().int().nonnegative("Volume cannot be negative").default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("The maximum volume on the contract").optional(),
})

// Action-specific schemas
const recentSchema = baseDarkpoolSchema.extend({
  action: z.literal("recent"),
  limit: z.number().int().min(1).max(200).describe("Maximum number of results").default(100).optional(),
})

const darkpoolTickerSchema = baseDarkpoolSchema.extend({
  action: z.literal("ticker"),
  ticker: tickerSchema.describe("Ticker symbol (required for ticker action)"),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").default(500).optional(),
})

// Union of all action schemas
const darkpoolInputSchema = z.discriminatedUnion("action", [
  recentSchema,
  darkpoolTickerSchema,
])


export const darkpoolTool = {
  name: "uw_darkpool",
  description: `Access UnusualWhales darkpool trade data.

Available actions:
- recent: Get recent darkpool trades across the market
- ticker: Get darkpool trades for a specific ticker

Filtering options include premium range, size range, and volume range.`,
  inputSchema: toJsonSchema(darkpoolInputSchema),
  zodInputSchema: darkpoolInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
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

  const data = parsed.data

  switch (data.action) {
    case "recent":
      return formatResponse(await uwFetch("/api/darkpool/recent", {
        date: data.date,
        limit: data.limit,
        min_premium: data.min_premium,
        max_premium: data.max_premium,
        min_size: data.min_size,
        max_size: data.max_size,
        min_volume: data.min_volume,
        max_volume: data.max_volume,
      }))

    case "ticker":
      return formatResponse(await uwFetch(`/api/darkpool/${encodePath(data.ticker)}`, {
        date: data.date,
        limit: data.limit,
        min_premium: data.min_premium,
        max_premium: data.max_premium,
        min_size: data.min_size,
        max_size: data.max_size,
        min_volume: data.min_volume,
        max_volume: data.max_volume,
        newer_than: data.newer_than,
        older_than: data.older_than,
      }))

    default:
      return formatError(`Unknown action: ${(data as { action: string }).action}`)
  }
}
