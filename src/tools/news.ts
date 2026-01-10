import { z } from "zod"
import { uwFetch, formatResponse, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, limitSchema, pageSchema, formatZodError,
} from "../schemas/index.js"

const newsActions = ["headlines"] as const

const newsInputSchema = z.object({
  action: z.enum(newsActions).describe("The action to perform"),
  ticker: tickerSchema.describe("Filter by ticker symbol").optional(),
  limit: limitSchema.default(50).optional(),
  sources: z.string().describe("Filter by news sources").optional(),
  search_term: z.string().describe("Search term to filter headlines").optional(),
  major_only: z.boolean().default(false).optional(),
  page: pageSchema.optional(),
})


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
 * Handle news tool requests.
 *
 * @param args - Tool arguments containing action and optional news filters
 * @returns JSON string with news data or error message
 */
export async function handleNews(args: Record<string, unknown>): Promise<string> {
  const parsed = newsInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const { action, ticker, limit, sources, search_term, major_only, page } = parsed.data

  switch (action) {
    case "headlines":
      return formatResponse(await uwFetch("/api/news/headlines", {
        ticker,
        limit,
        sources,
        search_term,
        major_only,
        page,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
