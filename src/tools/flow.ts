import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import {
  toJsonSchema,
  tickerSchema,
  dateSchema,
  expirySchema,
  limitSchema,
  optionTypeSchema,
  orderSchema,
  flowGroupSchema,
  premiumFilterSchema,
  sizeFilterSchema,
  oiFilterSchema,
  dteFilterSchema,
  flowTradeFiltersSchema,
  formatZodError,
} from "../schemas.js"

const flowActions = ["flow_alerts", "full_tape", "net_flow_expiry", "group_greek_flow", "group_greek_flow_expiry"] as const

const flowInputSchema = z.object({
  action: z.enum(flowActions).describe("The action to perform"),
  date: dateSchema.optional(),
  flow_group: flowGroupSchema.optional(),
  expiry: expirySchema.optional(),
  ticker: tickerSchema.describe("Ticker symbol filter").optional(),
  limit: limitSchema.optional(),
  side: optionTypeSchema.describe("Trade side (call or put)").optional(),
  order: orderSchema.optional(),
}).merge(premiumFilterSchema)
  .merge(sizeFilterSchema)
  .merge(oiFilterSchema)
  .merge(dteFilterSchema)
  .merge(flowTradeFiltersSchema)


export const flowTool = {
  name: "uw_flow",
  description: `Access UnusualWhales options flow data including flow alerts, full tape, net flow, and group flow.

Available actions:
- flow_alerts: Get flow alerts with extensive filtering options
- full_tape: Get full options tape for a date (date required)
- net_flow_expiry: Get net flow by expiry date (date optional)
- group_greek_flow: Get greek flow (delta & vega) for a flow group (flow_group required; date optional)
- group_greek_flow_expiry: Get greek flow by expiry for a flow group (flow_group, expiry required; date optional)

Flow groups: airline, bank, basic materials, china, communication services, consumer cyclical, consumer defensive, crypto, cyber, energy, financial services, gas, gold, healthcare, industrials, mag7, oil, real estate, refiners, reit, semi, silver, technology, uranium, utilities

Flow alerts filtering options include: ticker, premium range, volume range, OI range, DTE range, and more.`,
  inputSchema: toJsonSchema(flowInputSchema),
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle flow tool requests.
 *
 * @param args - Tool arguments containing action and optional flow filters
 * @returns JSON string with flow data or error message
 */
export async function handleFlow(args: Record<string, unknown>): Promise<string> {
  const parsed = flowInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const {
    action,
    date,
    flow_group,
    expiry,
    ticker,
    limit,
    min_premium,
    max_premium,
    min_size,
    max_size,
    min_oi,
    max_oi,
    min_dte,
    max_dte,
    is_floor,
    is_sweep,
    is_multi_leg,
    is_unusual,
    is_golden_sweep,
    side,
    order,
  } = parsed.data

  switch (action) {
    case "flow_alerts":
      return formatResponse(await uwFetch("/api/option-trades/flow-alerts", {
        date,
        ticker_symbol: ticker,
        limit,
        min_premium,
        max_premium,
        min_size,
        max_size,
        min_oi,
        max_oi,
        min_dte,
        max_dte,
        is_floor,
        is_sweep,
        is_multi_leg,
        is_unusual,
        is_golden_sweep,
        side,
        order,
      }))

    case "full_tape":
      if (!date) return formatError("date is required")
      return formatResponse(await uwFetch(`/api/option-trades/full-tape/${encodePath(date)}`))

    case "net_flow_expiry":
      return formatResponse(await uwFetch("/api/net-flow/expiry", { date }))

    case "group_greek_flow":
      if (!flow_group) return formatError("flow_group is required")
      return formatResponse(await uwFetch(`/api/group-flow/${encodePath(flow_group)}/greek-flow`, { date }))

    case "group_greek_flow_expiry":
      if (!flow_group || !expiry) return formatError("flow_group and expiry are required")
      return formatResponse(await uwFetch(`/api/group-flow/${encodePath(flow_group)}/greek-flow/${encodePath(expiry)}`, { date }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
