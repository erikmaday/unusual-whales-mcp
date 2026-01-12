import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, pageSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Earnings-specific limit schema with max 100
const earningsLimitSchema = z.number()
  .int()
  .min(1)
  .max(100)
  .default(50)
  .describe("Maximum number of results (default 50, max 100)")

// Explicit per-action schemas
const premarketSchema = z.object({
  action_type: z.literal("premarket"),
  date: dateSchema.optional(),
  limit: earningsLimitSchema.optional(),
  page: pageSchema.optional(),
})

const afterhoursSchema = z.object({
  action_type: z.literal("afterhours"),
  date: dateSchema.optional(),
  limit: earningsLimitSchema.optional(),
  page: pageSchema.optional(),
})

const tickerSchema$ = z.object({
  action_type: z.literal("ticker"),
  ticker: tickerSchema.describe("Ticker symbol (required for ticker action)"),
})

// Discriminated union of all action schemas
const earningsInputSchema = z.discriminatedUnion("action_type", [
  premarketSchema,
  afterhoursSchema,
  tickerSchema$,
])

export const earningsTool = {
  name: "uw_earnings",
  description: `Access UnusualWhales earnings data including premarket and afterhours earnings schedules.

Available actions:
- premarket: Get premarket earnings for a date
- afterhours: Get afterhours earnings for a date
- ticker: Get historical earnings for a ticker (ticker required)`,
  inputSchema: toJsonSchema(earningsInputSchema),
  zodInputSchema: earningsInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle earnings tool requests using the tool factory pattern
 */
export const handleEarnings = createToolHandler(earningsInputSchema, {
  premarket: async (data) => {
    return uwFetch("/api/earnings/premarket", {
      date: data.date,
      limit: data.limit,
      page: data.page,
    })
  },

  afterhours: async (data) => {
    return uwFetch("/api/earnings/afterhours", {
      date: data.date,
      limit: data.limit,
      page: data.page,
    })
  },

  ticker: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/earnings/{ticker}")
    return uwFetch(path)
  },
})
