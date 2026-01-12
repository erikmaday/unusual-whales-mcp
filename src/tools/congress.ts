import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, limitSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"

// Explicit per-action schemas
const recentTradesSchema = z.object({
  action: z.literal("recent_trades"),
  ticker: tickerSchema.optional(),
  date: dateSchema.optional(),
  limit: limitSchema.min(1).max(200).default(100).describe("Maximum number of results (default 100, max 200)").optional(),
})

const lateReportsSchema = z.object({
  action: z.literal("late_reports"),
  ticker: tickerSchema.optional(),
  date: dateSchema.optional(),
  limit: limitSchema.min(1).max(200).default(100).describe("Maximum number of results (default 100, max 200)").optional(),
})

const congressTraderSchema = z.object({
  action: z.literal("congress_trader"),
  name: z.string().describe("Congress member name (for congress_trader action)").default("Nancy Pelosi").optional(),
  ticker: tickerSchema.optional(),
  date: dateSchema.optional(),
  limit: limitSchema.min(1).max(200).default(100).describe("Maximum number of results (default 100, max 200)").optional(),
})

// Discriminated union of all action schemas
const congressInputSchema = z.discriminatedUnion("action", [
  recentTradesSchema,
  lateReportsSchema,
  congressTraderSchema,
])

export const congressTool = {
  name: "uw_congress",
  description: `Access UnusualWhales congress trading data including trades by congress members.

Available actions:
- recent_trades: Get recent trades by congress members
- late_reports: Get recent late reports by congress members
- congress_trader: Get trades by a specific congress member (name required)`,
  inputSchema: toJsonSchema(congressInputSchema),
  zodInputSchema: congressInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle congress tool requests using the tool factory pattern
 */
export const handleCongress = createToolHandler(congressInputSchema, {
  recent_trades: async (data) => {
    return uwFetch("/api/congress/recent-trades", {
      date: data.date,
      ticker: data.ticker,
      limit: data.limit,
    })
  },

  late_reports: async (data) => {
    return uwFetch("/api/congress/late-reports", {
      date: data.date,
      ticker: data.ticker,
      limit: data.limit,
    })
  },

  congress_trader: async (data) => {
    return uwFetch("/api/congress/congress-trader", {
      name: data.name,
      date: data.date,
      ticker: data.ticker,
      limit: data.limit,
    })
  },
})
