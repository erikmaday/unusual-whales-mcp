import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas
const recentSchema = z.object({
  action: z.literal("recent"),
  date: dateSchema.optional(),
  limit: z.number().int().min(1).max(200).describe("Maximum number of results").default(100).optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
  older_than: z.string().describe("Filter trades older than timestamp").optional(),
  min_premium: z.number().int().nonnegative().default(0).describe("The minimum premium on the alert or trade").optional(),
  max_premium: z.number().int().nonnegative().describe("The maximum premium on the alert or trade").optional(),
  min_size: z.number().int().nonnegative().default(0).describe("The minimum size on that alert. Size is defined as the sum of the sizes of all transactions that make up the alert").optional(),
  max_size: z.number().int().nonnegative().describe("The maximum size on that alert").optional(),
  min_volume: z.number().int().nonnegative().default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative().describe("The maximum volume on the contract").optional(),
})

const tickerSchema$ = z.object({
  action: z.literal("ticker"),
  ticker: tickerSchema.describe("Ticker symbol (required for ticker action)"),
  date: dateSchema.optional(),
  limit: z.number().int().min(1).max(500).describe("Maximum number of results").default(500).optional(),
  newer_than: z.string().describe("Filter trades newer than timestamp").optional(),
  older_than: z.string().describe("Filter trades older than timestamp").optional(),
  min_premium: z.number().int().nonnegative().default(0).describe("The minimum premium on the alert or trade").optional(),
  max_premium: z.number().int().nonnegative().describe("The maximum premium on the alert or trade").optional(),
  min_size: z.number().int().nonnegative().default(0).describe("The minimum size on that alert. Size is defined as the sum of the sizes of all transactions that make up the alert").optional(),
  max_size: z.number().int().nonnegative().describe("The maximum size on that alert").optional(),
  min_volume: z.number().int().nonnegative().default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative().describe("The maximum volume on the contract").optional(),
})

// Discriminated union of all action schemas
const darkpoolInputSchema = z.discriminatedUnion("action", [
  recentSchema,
  tickerSchema$,
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
 * Handle darkpool tool requests using the tool factory pattern
 */
export const handleDarkpool = createToolHandler(darkpoolInputSchema, {
  recent: async (data) => {
    return uwFetch("/api/darkpool/recent", {
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
    })
  },

  ticker: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/darkpool/{ticker}")
    return uwFetch(path, {
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
    })
  },
})
