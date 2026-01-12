import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, limitSchema, orderDirectionSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"
import {
  institutionalActivityOrderBySchema,
  institutionalHoldingsOrderBySchema,
  institutionalListOrderBySchema,
  institutionalOwnershipOrderBySchema,
  latestInstitutionalFilingsOrderBySchema,
} from "../schemas/institutions.js"

// Explicit per-action schemas
const listSchema = z.object({
  action_type: z.literal("list"),
  name: z.string().optional(),
  limit: limitSchema.default(500).optional(),
  page: z.number().optional(),
  order: institutionalListOrderBySchema.optional(),
  order_direction: orderDirectionSchema.default("desc").optional(),
  min_total_value: z.number().optional(),
  max_total_value: z.number().optional(),
  min_share_value: z.number().optional(),
  max_share_value: z.number().optional(),
  tags: z.string().optional(),
})

const holdingsSchema = z.object({
  action_type: z.literal("holdings"),
  name: z.string().describe("Institution name"),
  date: dateSchema.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: limitSchema.default(500).optional(),
  page: z.number().optional(),
  order: institutionalHoldingsOrderBySchema.optional(),
  order_direction: orderDirectionSchema.default("desc").optional(),
  security_types: z.string().optional(),
})

const activitySchema = z.object({
  action_type: z.literal("activity"),
  name: z.string().describe("Institution name"),
  date: dateSchema.optional(),
  limit: limitSchema.default(500).optional(),
  page: z.number().optional(),
  order: institutionalActivityOrderBySchema.optional(),
  order_direction: orderDirectionSchema.default("desc").optional(),
})

const sectorsSchema = z.object({
  action_type: z.literal("sectors"),
  name: z.string().describe("Institution name"),
  date: dateSchema.optional(),
  limit: limitSchema.default(500).optional(),
  page: z.number().optional(),
})

const ownershipSchema = z.object({
  action_type: z.literal("ownership"),
  ticker: tickerSchema.describe("Ticker symbol (for ownership)"),
  date: dateSchema.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  tags: z.string().optional(),
  limit: limitSchema.default(500).optional(),
  page: z.number().optional(),
  order: institutionalOwnershipOrderBySchema.optional(),
  order_direction: orderDirectionSchema.default("desc").optional(),
})

const latestFilingsSchema = z.object({
  action_type: z.literal("latest_filings"),
  name: z.string().optional(),
  date: dateSchema.optional(),
  limit: limitSchema.default(500).optional(),
  page: z.number().optional(),
  order: latestInstitutionalFilingsOrderBySchema.optional(),
  order_direction: orderDirectionSchema.default("desc").optional(),
})

// Discriminated union of all action schemas
const institutionsInputSchema = z.discriminatedUnion("action_type", [
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
 * Handle institutions tool requests using the tool factory pattern
 */
export const handleInstitutions = createToolHandler(institutionsInputSchema, {
  list: async (data) => {
    return uwFetch("/api/institutions", {
      name: data.name,
      limit: data.limit,
      page: data.page,
      order: data.order,
      order_direction: data.order_direction,
      min_total_value: data.min_total_value,
      max_total_value: data.max_total_value,
      min_share_value: data.min_share_value,
      max_share_value: data.max_share_value,
      tags: data.tags,
    })
  },

  holdings: async (data) => {
    const path = new PathParamBuilder()
      .add("name", data.name)
      .build("/api/institution/{name}/holdings")
    return uwFetch(path, {
      date: data.date,
      start_date: data.start_date,
      end_date: data.end_date,
      limit: data.limit,
      page: data.page,
      order: data.order,
      order_direction: data.order_direction,
      security_types: data.security_types,
    })
  },

  activity: async (data) => {
    const path = new PathParamBuilder()
      .add("name", data.name)
      .build("/api/institution/{name}/activity")
    return uwFetch(path, {
      date: data.date,
      limit: data.limit,
      page: data.page,
      order: data.order,
      order_direction: data.order_direction,
    })
  },

  sectors: async (data) => {
    const path = new PathParamBuilder()
      .add("name", data.name)
      .build("/api/institution/{name}/sectors")
    return uwFetch(path, {
      date: data.date,
      limit: data.limit,
      page: data.page,
    })
  },

  ownership: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/institution/{ticker}/ownership")
    return uwFetch(path, {
      date: data.date,
      start_date: data.start_date,
      end_date: data.end_date,
      "tags[]": data.tags,
      limit: data.limit,
      page: data.page,
      order: data.order,
      order_direction: data.order_direction,
    })
  },

  latest_filings: async (data) => {
    return uwFetch("/api/institutions/latest_filings", {
      name: data.name,
      date: data.date,
      limit: data.limit,
      page: data.page,
      order: data.order,
      order_direction: data.order_direction,
    })
  },
})
