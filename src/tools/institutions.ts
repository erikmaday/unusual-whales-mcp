import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, limitSchema, orderDirectionSchema, formatZodError,
  institutionalActivityOrderBySchema,
  institutionalHoldingsOrderBySchema,
  institutionalListOrderBySchema,
  institutionalOwnershipOrderBySchema,
  latestInstitutionalFilingsOrderBySchema,
} from "../schemas/index.js"

const institutionsActions = ["list", "holdings", "activity", "sectors", "ownership", "latest_filings"] as const

// Base schema with common fields
const baseInstitutionsSchema = z.object({
  name: z.string().describe("Institution name").optional(),
  ticker: tickerSchema.describe("Ticker symbol (for ownership)").optional(),
  date: dateSchema.describe("Report date in YYYY-MM-DD format").optional(),
  start_date: z.string().describe("Start date for date range").optional(),
  end_date: z.string().describe("End date for date range").optional(),
  limit: limitSchema.default(500).optional(),
  page: z.number().describe("Page number for pagination").optional(),
  order_direction: orderDirectionSchema.default("desc").optional(),
  min_total_value: z.number().describe("Minimum total value filter").optional(),
  max_total_value: z.number().describe("Maximum total value filter").optional(),
  min_share_value: z.number().describe("Minimum share value filter").optional(),
  max_share_value: z.number().describe("Maximum share value filter").optional(),
  tags: z.string().describe("Institution tags filter").optional(),
  security_types: z.string().describe("Security types filter").optional(),
})

// Action-specific schemas with appropriate order enum
const listSchema = baseInstitutionsSchema.extend({
  action: z.literal("list"),
  order: institutionalListOrderBySchema.optional(),
})

const holdingsSchema = baseInstitutionsSchema.extend({
  action: z.literal("holdings"),
  order: institutionalHoldingsOrderBySchema.optional(),
})

const activitySchema = baseInstitutionsSchema.extend({
  action: z.literal("activity"),
  order: institutionalActivityOrderBySchema.optional(),
})

const sectorsSchema = baseInstitutionsSchema.extend({
  action: z.literal("sectors"),
  order: z.string().describe("Order by field").optional(),
})

const ownershipSchema = baseInstitutionsSchema.extend({
  action: z.literal("ownership"),
  order: institutionalOwnershipOrderBySchema.optional(),
})

const latestFilingsSchema = baseInstitutionsSchema.extend({
  action: z.literal("latest_filings"),
  order: latestInstitutionalFilingsOrderBySchema.optional(),
})

// Union of all action schemas
const institutionsInputSchema = z.discriminatedUnion("action", [
  listSchema,
  holdingsSchema,
  activitySchema,
  sectorsSchema,
  ownershipSchema,
  latestFilingsSchema,
])


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
  inputSchema: toJsonSchema(institutionsInputSchema),
  zodInputSchema: institutionsInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
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
  const parsed = institutionsInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

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
    min_share_value,
    max_share_value,
    tags,
    security_types,
  } = parsed.data

  switch (action) {
    case "list":
      return formatResponse(await uwFetch("/api/institutions", {
        name,
        min_total_value,
        max_total_value,
        min_share_value,
        max_share_value,
        "tags[]": tags,
        order,
        order_direction,
        limit,
        page,
      }))

    case "holdings":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(name)}/holdings`, {
        date,
        start_date,
        end_date,
        security_types,
        limit,
        page,
        order,
        order_direction,
      }))

    case "activity":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(name)}/activity`, {
        date,
        order,
        order_direction,
        limit,
        page,
      }))

    case "sectors":
      if (!name) return formatError("name is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(name)}/sectors`, {
        date,
        limit,
        page,
      }))

    case "ownership":
      if (!ticker) return formatError("ticker is required")
      return formatResponse(await uwFetch(`/api/institution/${encodePath(ticker)}/ownership`, {
        date,
        start_date,
        end_date,
        "tags[]": tags,
        order,
        order_direction,
        limit,
        page,
      }))

    case "latest_filings":
      return formatResponse(await uwFetch("/api/institutions/latest_filings", {
        name,
        date,
        order,
        order_direction,
        limit,
        page,
      }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
