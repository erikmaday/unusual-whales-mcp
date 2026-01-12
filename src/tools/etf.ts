import { z } from "zod"
import { uwFetch } from "../client.js"
import { toJsonSchema, tickerSchema } from "../schemas/index.js"
import { createToolHandler } from "./base/tool-factory.js"
import { PathParamBuilder } from "../utils/path-params.js"

// Explicit per-action schemas
const infoSchema = z.object({
  action: z.literal("info"),
  ticker: tickerSchema.describe("ETF ticker symbol (e.g., SPY, QQQ)"),
})

const holdingsSchema = z.object({
  action: z.literal("holdings"),
  ticker: tickerSchema.describe("ETF ticker symbol (e.g., SPY, QQQ)"),
})

const exposureSchema = z.object({
  action: z.literal("exposure"),
  ticker: tickerSchema.describe("ETF ticker symbol (e.g., SPY, QQQ)"),
})

const inOutflowSchema = z.object({
  action: z.literal("in_outflow"),
  ticker: tickerSchema.describe("ETF ticker symbol (e.g., SPY, QQQ)"),
})

const weightsSchema = z.object({
  action: z.literal("weights"),
  ticker: tickerSchema.describe("ETF ticker symbol (e.g., SPY, QQQ)"),
})

// Discriminated union of all action schemas
const etfInputSchema = z.discriminatedUnion("action", [
  infoSchema,
  holdingsSchema,
  exposureSchema,
  inOutflowSchema,
  weightsSchema,
])

export const etfTool = {
  name: "uw_etf",
  description: `Access UnusualWhales ETF data including holdings, exposure, inflows/outflows, and weights.

Available actions:
- info: Get ETF information (ticker required)
- holdings: Get ETF holdings (ticker required)
- exposure: Get ETFs that hold a ticker (ticker required)
- in_outflow: Get ETF inflow/outflow data (ticker required)
- weights: Get sector and country weights (ticker required)`,
  inputSchema: toJsonSchema(etfInputSchema),
  zodInputSchema: etfInputSchema,
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle ETF tool requests using the tool factory pattern
 */
export const handleEtf = createToolHandler(etfInputSchema, {
  info: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/etfs/{ticker}/info")
    return uwFetch(path)
  },

  holdings: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/etfs/{ticker}/holdings")
    return uwFetch(path)
  },

  exposure: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/etfs/{ticker}/exposure")
    return uwFetch(path)
  },

  in_outflow: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/etfs/{ticker}/in-outflow")
    return uwFetch(path)
  },

  weights: async (data) => {
    const path = new PathParamBuilder()
      .add("ticker", data.ticker)
      .build("/api/etfs/{ticker}/weights")
    return uwFetch(path)
  },
})
