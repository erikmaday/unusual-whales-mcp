import { z } from "zod"
import { uwFetch, formatResponse, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, limitSchema, formatZodError } from "../schemas/index.js"

const congressActions = ["recent_trades", "late_reports", "congress_trader"] as const

const congressInputSchema = z.object({
  action: z.enum(congressActions).describe("The action to perform"),
  name: z.string().describe("Congress member name (for congress_trader action)").optional(),
  ticker: tickerSchema.optional(),
  date: dateSchema.optional(),
  limit: limitSchema.describe("Maximum number of results (default 100, max 200)").optional(),
})


export const congressTool = {
  name: "uw_congress",
  description: `Access UnusualWhales congress trading data including trades by congress members.

Available actions:
- recent_trades: Get recent trades by congress members
- late_reports: Get recent late reports by congress members
- congress_trader: Get trades by a specific congress member (name required)`,
  inputSchema: toJsonSchema(congressInputSchema),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle congress tool requests.
 *
 * @param args - Tool arguments containing action and optional congress trade filters
 * @returns JSON string with congress trading data or error message
 */
export async function handleCongress(args: Record<string, unknown>): Promise<string> {
  const parsed = congressInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const { action, name, ticker, date, limit } = parsed.data

  switch (action) {
    case "recent_trades":
      return formatResponse(await uwFetch("/api/congress/recent-trades", {
        date,
        ticker,
        limit,
      }))

    case "late_reports":
      return formatResponse(await uwFetch("/api/congress/late-reports", {
        date,
        ticker,
        limit,
      }))

    case "congress_trader":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch("/api/congress/congress-trader", {
        name,
        date,
        ticker,
        limit,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
