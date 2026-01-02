import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const darkpoolTool = {
  name: "uw_darkpool",
  description: `Access UnusualWhales darkpool trade data.

Available actions:
- recent: Get recent darkpool trades across the market
- ticker: Get darkpool trades for a specific ticker

Filtering options include premium range, size range, and volume range.`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["recent", "ticker"],
      },
      ticker: {
        type: "string",
        description: "Ticker symbol (required for ticker action)",
      },
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
      min_premium: {
        type: "number",
        description: "Minimum premium filter",
      },
      max_premium: {
        type: "number",
        description: "Maximum premium filter",
      },
      min_size: {
        type: "number",
        description: "Minimum size filter",
      },
      max_size: {
        type: "number",
        description: "Maximum size filter",
      },
      min_volume: {
        type: "number",
        description: "Minimum volume filter",
      },
      max_volume: {
        type: "number",
        description: "Maximum volume filter",
      },
      newer_than: {
        type: "string",
        description: "Filter trades newer than timestamp",
      },
      older_than: {
        type: "string",
        description: "Filter trades older than timestamp",
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
 * Handle darkpool tool requests.
 *
 * @param args - Tool arguments containing action and optional darkpool filters
 * @returns JSON string with darkpool data or error message
 */
export async function handleDarkpool(args: Record<string, unknown>): Promise<string> {
  const {
    action,
    ticker,
    date,
    limit,
    min_premium,
    max_premium,
    min_size,
    max_size,
    min_volume,
    max_volume,
    newer_than,
    older_than,
  } = args

  switch (action) {
    case "recent":
      return formatResponse(await uwFetch("/api/darkpool/recent", {
        date: date as string,
        limit: limit as number,
        min_premium: min_premium as number,
        max_premium: max_premium as number,
        min_size: min_size as number,
        max_size: max_size as number,
        min_volume: min_volume as number,
        max_volume: max_volume as number,
      }))

    case "ticker":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/darkpool/${encodePath(ticker)}`, {
        date: date as string,
        limit: limit as number,
        min_premium: min_premium as number,
        max_premium: max_premium as number,
        min_size: min_size as number,
        max_size: max_size as number,
        min_volume: min_volume as number,
        max_volume: max_volume as number,
        newer_than: newer_than as string,
        older_than: older_than as string,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
