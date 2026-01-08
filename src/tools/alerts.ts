import { z } from "zod"
import { uwFetch, formatResponse, formatError } from "../client.js"
import { toJsonSchema, limitSchema, formatZodError } from "../schemas/index.js"

const alertsActions = ["alerts", "configurations"] as const

const alertsInputSchema = z.object({
  action: z.enum(alertsActions).describe("The action to perform"),
  limit: limitSchema.optional(),
  ticker_symbols: z.string().describe("Comma-separated list of tickers to filter by. Prefix with '-' to exclude tickers (e.g., 'AAPL,INTC' or '-TSLA,NVDA')").optional(),
  intraday_only: z.boolean().describe("Only show intraday alerts").optional(),
  config_ids: z.string().describe("Filter by configuration IDs").optional(),
  noti_types: z.string().describe("Filter by notification types").optional(),
  newer_than: z.string().describe("Filter alerts newer than timestamp (ISO format or unix)").optional(),
  older_than: z.string().describe("Filter alerts older than timestamp (ISO format or unix)").optional(),
})


export const alertsTool = {
  name: "uw_alerts",
  description: `Access UnusualWhales user alerts and configurations.

Available actions:
- alerts: Get triggered alerts for the user
- configurations: Get alert configurations`,
  inputSchema: toJsonSchema(alertsInputSchema),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle alerts tool requests.
 *
 * @param args - Tool arguments containing action and optional alert filters
 * @returns JSON string with alert data or error message
 */
export async function handleAlerts(args: Record<string, unknown>): Promise<string> {
  const parsed = alertsInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const { action, limit, ticker_symbols, intraday_only, config_ids, noti_types, newer_than, older_than } = parsed.data

  switch (action) {
    case "alerts":
      return formatResponse(await uwFetch("/api/alerts", {
        limit,
        ticker_symbols,
        intraday_only,
        "config_ids[]": config_ids,
        "noti_types[]": noti_types,
        newer_than,
        older_than,
      }))

    case "configurations":
      return formatResponse(await uwFetch("/api/alerts/configuration"))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
