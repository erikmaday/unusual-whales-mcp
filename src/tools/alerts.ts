import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, limitSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"

// Explicit per-action schemas
const alertsSchema = z.object({
  action_type: z.literal("alerts"),
  limit: limitSchema.default(1).optional(),
  ticker_symbols: z.string().describe("Comma-separated list of tickers to filter by. Prefix with '-' to exclude tickers (e.g., 'AAPL,INTC' or '-TSLA,NVDA')").optional(),
  intraday_only: z.boolean().describe("Only show intraday alerts").default(true).optional(),
  config_ids: z.string().describe("Filter by configuration IDs").optional(),
  noti_types: z.string().describe("Filter by notification types").optional(),
  newer_than: z.string().datetime().describe("Filter alerts newer than timestamp (ISO format or unix)").optional(),
  older_than: z.string().datetime().describe("Filter alerts older than timestamp (ISO format or unix)").optional(),
})

const configurationsSchema = z.object({
  action_type: z.literal("configurations"),
})

// Discriminated union of all action schemas
const alertsInputSchema = z.discriminatedUnion("action_type", [
  alertsSchema,
  configurationsSchema,
])

export const alertsTool = {
  name: "uw_alerts",
  description: `Access UnusualWhales user alerts and configurations.

Available actions:
- alerts: Get triggered alerts for the user
- configurations: Get alert configurations`,
  inputSchema: toJsonSchema(alertsInputSchema),
  zodInputSchema: alertsInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle alerts tool requests using the tool factory pattern
 */
export const handleAlerts = createToolHandler(alertsInputSchema, {
  alerts: async (data) => {
    return uwFetch("/api/alerts", {
      limit: data.limit,
      ticker_symbols: data.ticker_symbols,
      intraday_only: data.intraday_only,
      "config_ids[]": data.config_ids,
      "noti_types[]": data.noti_types,
      newer_than: data.newer_than,
      older_than: data.older_than,
    })
  },

  configurations: async () => {
    return uwFetch("/api/alerts/configuration")
  },
})
