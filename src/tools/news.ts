import { z } from "zod"
import { uwFetch, formatResponse, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, limitSchema, formatZodError,
} from "../schemas.js"

const newsActions = ["headlines"] as const

const newsInputSchema = z.object({
  action: z.enum(newsActions).describe("The action to perform"),
  ticker: tickerSchema.describe("Filter by ticker symbol").optional(),
  limit: limitSchema.optional(),
})


export const newsTool = {
  name: "uw_news",
  description: `Access UnusualWhales news headlines.

Available actions:
- headlines: Get news headlines with optional ticker filter`,
  inputSchema: toJsonSchema(newsInputSchema),
  annotations: {
    readOnlyHint: true,
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

  const { action, ticker, limit } = parsed.data

  switch (action) {
    case "headlines":
      return formatResponse(await uwFetch("/api/news/headlines", {
        ticker,
        limit,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
