import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema, pageSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"

// News-specific limit schema with max 500
const newsLimitSchema = z.number()
  .int()
  .min(1)
  .max(500)
  .default(50)
  .describe("Maximum number of results (default 50, max 500)")

// Explicit per-action schema
const headlinesSchema = z.object({
  action_type: z.literal("headlines"),
  ticker: tickerSchema.describe("Filter by ticker symbol").optional(),
  limit: newsLimitSchema.optional(),
  sources: z.string().describe("Filter by news sources").optional(),
  search_term: z.string().describe("Search term to filter headlines").optional(),
  major_only: z.boolean().default(false).optional(),
  page: pageSchema.optional(),
})

// Discriminated union (only one action for now)
const newsInputSchema = z.discriminatedUnion("action_type", [headlinesSchema])

export const newsTool = {
  name: "uw_news",
  description: `Access UnusualWhales news headlines.

Available actions:
- headlines: Get news headlines with optional filters (ticker, sources, search_term, major_only, page)`,
  inputSchema: toJsonSchema(newsInputSchema),
  zodInputSchema: newsInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle news tool requests using the tool factory pattern
 */
export const handleNews = createToolHandler(newsInputSchema, {
  headlines: async (data) => {
    return uwFetch("/api/news/headlines", {
      ticker: data.ticker,
      limit: data.limit,
      sources: data.sources,
      search_term: data.search_term,
      major_only: data.major_only,
      page: data.page,
    })
  },
})
