import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, dateSchema, limitSchema, sideSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas - each is a complete specification
const flowSchema = z.object({
  action: z.literal("flow"),
  id: z.string().describe("Option contract ID/symbol (e.g., AAPL240119C00150000)"),
  side: sideSchema.describe("Trade side (ALL, ASK, BID, or MID)").default("ALL").optional(),
  min_premium: z.number().int().nonnegative().describe("Minimum premium filter").default(0).optional(),
  limit: limitSchema.optional(),
  date: dateSchema.optional(),
})

const historicSchema = z.object({
  action: z.literal("historic"),
  id: z.string().describe("Option contract ID/symbol (e.g., AAPL240119C00150000)"),
  limit: limitSchema.optional(),
})

const intradaySchema = z.object({
  action: z.literal("intraday"),
  id: z.string().describe("Option contract ID/symbol (e.g., AAPL240119C00150000)"),
  date: dateSchema.optional(),
})

const volumeProfileSchema = z.object({
  action: z.literal("volume_profile"),
  id: z.string().describe("Option contract ID/symbol (e.g., AAPL240119C00150000)"),
  date: dateSchema.optional(),
})

// Discriminated union of all action schemas
const optionsInputSchema = z.discriminatedUnion("action", [
  flowSchema,
  historicSchema,
  intradaySchema,
  volumeProfileSchema,
])

export const optionsTool = {
  name: "uw_options",
  description: `Access UnusualWhales option contract data including flow, historic prices, intraday data, and volume profiles.

Available actions:
- flow: Get option contract flow (id required; side, min_premium, limit, date optional)
- historic: Get historic option contract data (id required; limit optional)
- intraday: Get intraday option contract data (id required; date optional)
- volume_profile: Get volume profile for option contract (id required; date optional)

The 'id' parameter is the option contract symbol (e.g., AAPL240119C00150000).`,
  inputSchema: toJsonSchema(optionsInputSchema),
  zodInputSchema: optionsInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle options tool requests using the tool factory pattern
 */
export const handleOptions = createToolHandler(optionsInputSchema, {
  flow: async (data) => {
    const path = new PathParamBuilder()
      .add("id", data.id)
      .build("/api/option-contract/{id}/flow")

    return uwFetch(path, {
      side: data.side,
      min_premium: data.min_premium,
      limit: data.limit,
      date: data.date,
    })
  },

  historic: async (data) => {
    const path = new PathParamBuilder()
      .add("id", data.id)
      .build("/api/option-contract/{id}/historic")

    return uwFetch(path, { limit: data.limit })
  },

  intraday: async (data) => {
    const path = new PathParamBuilder()
      .add("id", data.id)
      .build("/api/option-contract/{id}/intraday")

    return uwFetch(path, { date: data.date })
  },

  volume_profile: async (data) => {
    const path = new PathParamBuilder()
      .add("id", data.id)
      .build("/api/option-contract/{id}/volume-profile")

    return uwFetch(path, { date: data.date })
  },
})
