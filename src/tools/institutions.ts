import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const institutionsTool = {
  name: "uw_institutions",
  description: `Access UnusualWhales institutional holdings and ownership data.

Available actions:
- list: List institutions with filters
- holdings: Get holdings for an institution (name required)
- activity: Get trading activity for an institution (name required)
- sectors: Get sector exposure for an institution (name required)
- ownership: Get institutional ownership of a ticker (ticker required)
- latest_filings: Get latest institutional filings`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["list", "holdings", "activity", "sectors", "ownership", "latest_filings"],
      },
      name: {
        type: "string",
        description: "Institution name",
      },
      ticker: {
        type: "string",
        description: "Ticker symbol (for ownership)",
      },
      date: {
        type: "string",
        description: "Report date in YYYY-MM-DD format",
      },
      start_date: {
        type: "string",
        description: "Start date for date range",
      },
      end_date: {
        type: "string",
        description: "End date for date range",
      },
      limit: {
        type: "number",
        description: "Maximum number of results",
      },
      page: {
        type: "number",
        description: "Page number for pagination",
      },
      order: {
        type: "string",
        description: "Order by field",
      },
      order_direction: {
        type: "string",
        description: "Order direction (asc or desc)",
        enum: ["asc", "desc"],
      },
      min_total_value: {
        type: "number",
        description: "Minimum total value filter",
      },
      max_total_value: {
        type: "number",
        description: "Maximum total value filter",
      },
      tags: {
        type: "string",
        description: "Institution tags filter",
      },
      security_types: {
        type: "string",
        description: "Security types filter",
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
 * Handle institutions tool requests.
 *
 * @param args - Tool arguments containing action and optional institution parameters
 * @returns JSON string with institution data or error message
 */
export async function handleInstitutions(args: Record<string, unknown>): Promise<string> {
  const {
    action,
    name,
    ticker,
    date,
    start_date,
    end_date,
    limit,
    page,
    order,
    order_direction,
    min_total_value,
    max_total_value,
    tags,
    security_types,
  } = args

  switch (action) {
    case "list":
      return formatResponse(await uwFetch("/api/institutions", {
        name: name as string,
        min_total_value: min_total_value as number,
        max_total_value: max_total_value as number,
        "tags[]": tags as string,
        order: order as string,
        order_direction: order_direction as string,
        limit: limit as number,
        page: page as number,
      }))

    case "holdings":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(name)}/holdings`, {
        date: date as string,
        start_date: start_date as string,
        end_date: end_date as string,
        security_types: security_types as string,
        limit: limit as number,
        page: page as number,
        order: order as string,
        order_direction: order_direction as string,
      }))

    case "activity":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(name)}/activity`, {
        date: date as string,
        limit: limit as number,
        page: page as number,
      }))

    case "sectors":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(name)}/sectors`, {
        date: date as string,
        limit: limit as number,
        page: page as number,
      }))

    case "ownership":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(ticker)}/ownership`, {
        date: date as string,
        start_date: start_date as string,
        end_date: end_date as string,
        "tags[]": tags as string,
        order: order as string,
        order_direction: order_direction as string,
        limit: limit as number,
        page: page as number,
      }))

    case "latest_filings":
      return formatResponse(await uwFetch("/api/institutions/latest_filings", {
        name: name as string,
        date: date as string,
        order: order as string,
        order_direction: order_direction as string,
        limit: limit as number,
        page: page as number,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
