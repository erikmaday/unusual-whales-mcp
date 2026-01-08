import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, limitSchema, formatZodError,
} from "../schemas/index.js"

const earningsActions = ["premarket", "afterhours", "ticker"] as const

const earningsInputSchema = z.object({
  action: z.enum(earningsActions).describe("The action to perform"),
  ticker: tickerSchema.describe("Ticker symbol (for ticker action)").optional(),
  date: dateSchema.optional(),
  limit: limitSchema.optional(),
  page: z.number().describe("Page number for pagination").optional(),
})


export const earningsTool = {
  name: "uw_earnings",
  description: `Access UnusualWhales earnings data including premarket and afterhours earnings schedules.

Available actions:
- premarket: Get premarket earnings for a date
- afterhours: Get afterhours earnings for a date
- ticker: Get historical earnings for a ticker (ticker required)`,
  inputSchema: toJsonSchema(earningsInputSchema),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle earnings tool requests.
 *
 * @param args - Tool arguments containing action and optional earnings parameters
 * @returns JSON string with earnings data or error message
 */
export async function handleEarnings(args: Record<string, unknown>): Promise<string> {
  const parsed = earningsInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const { action, ticker, date, limit, page } = parsed.data

  switch (action) {
    case "premarket":
      return formatResponse(await uwFetch("/api/earnings/premarket", {
        date,
        limit,
        page,
      }))

    case "afterhours":
      return formatResponse(await uwFetch("/api/earnings/afterhours", {
        date,
        limit,
        page,
      }))

    case "ticker":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/earnings/${encodePath(ticker)}`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
