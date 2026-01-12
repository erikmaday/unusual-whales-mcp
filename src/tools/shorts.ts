import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas
const dataSchema = z.object({
  action: z.literal("data"),
  ticker: tickerSchema,
})

const ftdsSchema = z.object({
  action: z.literal("ftds"),
  ticker: tickerSchema,
})

const interestFloatSchema = z.object({
  action: z.literal("interest_float"),
  ticker: tickerSchema,
})

const volumeRatioSchema = z.object({
  action: z.literal("volume_ratio"),
  ticker: tickerSchema,
})

const volumesByExchangeSchema = z.object({
  action: z.literal("volumes_by_exchange"),
  ticker: tickerSchema,
})

// Discriminated union of all action schemas
const shortsInputSchema = z.discriminatedUnion("action", [
  dataSchema,
  ftdsSchema,
  interestFloatSchema,
  volumeRatioSchema,
  volumesByExchangeSchema,
])

export const shortsTool = {
  name: "uw_shorts",
  description: `Access UnusualWhales short selling data including short interest, FTDs, and volume.

Available actions:
- data: Get short data for a ticker (ticker required)
- ftds: Get failure to deliver data (ticker required)
- interest_float: Get short interest as percent of float (ticker required)
- volume_ratio: Get short volume and ratio (ticker required)
- volumes_by_exchange: Get short volumes by exchange (ticker required)`,
  inputSchema: toJsonSchema(shortsInputSchema),
  zodInputSchema: shortsInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle shorts tool requests using the tool factory pattern
 */
export const handleShorts = createToolHandler(shortsInputSchema, {
  data: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/shorts/{ticker}/data")
    return uwFetch(path)
  },

  ftds: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/shorts/{ticker}/ftds")
    return uwFetch(path)
  },

  interest_float: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/shorts/{ticker}/interest-float")
    return uwFetch(path)
  },

  volume_ratio: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/shorts/{ticker}/volume-and-ratio")
    return uwFetch(path)
  },

  volumes_by_exchange: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/shorts/{ticker}/volumes-by-exchange")
    return uwFetch(path)
  },
})
