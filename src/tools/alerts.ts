import { uwFetch, formatResponse, formatError } from "../client.js"

export const alertsTool = {
  name: "uw_alerts",
  description: `Access UnusualWhales user alerts and configurations.

Available actions:
- alerts: Get triggered alerts for the user
- configurations: Get alert configurations`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["alerts", "configurations"],
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
      ticker: {
        type: "string",
        description: "Filter by ticker symbol",
      },
      intraday_only: {
        type: "boolean",
        description: "Only show intraday alerts",
      },
      config_ids: {
        type: "string",
        description: "Filter by configuration IDs",
      },
      noti_types: {
        type: "string",
        description: "Filter by notification types",
      },
      newer_than: {
        type: "string",
        description: "Filter alerts newer than timestamp (ISO format or unix)",
      },
      older_than: {
        type: "string",
        description: "Filter alerts older than timestamp (ISO format or unix)",
      },
    },
    required: ["action"],
  },
  annotations: {
    readOnlyHint: true,
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
  const { action, limit, ticker, intraday_only, config_ids, noti_types, newer_than, older_than } = args

  switch (action) {
    case "alerts":
      return formatResponse(await uwFetch("/api/alerts", {
        limit: limit as number,
        ticker_symbols: ticker as string,
        intraday_only: intraday_only as boolean,
        "config_ids[]": config_ids as string,
        "noti_types[]": noti_types as string,
        newer_than: newer_than as string,
        older_than: older_than as string,
      }))

    case "configurations":
      return formatResponse(await uwFetch("/api/alerts/configuration"))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
