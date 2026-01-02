import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

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
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        description: "The action to perform",
        enum: ["flow_alerts", "full_tape", "net_flow_expiry", "group_greek_flow", "group_greek_flow_expiry"],
      },
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format",
      },
      flow_group: {
        type: "string",
        description: "Flow group (e.g., mag7, semi, bank, energy, crypto)",
        enum: ["airline", "bank", "basic materials", "china", "communication services", "consumer cyclical", "consumer defensive", "crypto", "cyber", "energy", "financial services", "gas", "gold", "healthcare", "industrials", "mag7", "oil", "real estate", "refiners", "reit", "semi", "silver", "technology", "uranium", "utilities"],
      },
      expiry: {
        type: "string",
        description: "Option expiry date in YYYY-MM-DD format",
      },
      ticker: {
        type: "string",
        description: "Ticker symbol filter",
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
        description: "Minimum size/volume filter",
      },
      max_size: {
        type: "number",
        description: "Maximum size/volume filter",
      },
      min_oi: {
        type: "number",
        description: "Minimum open interest filter",
      },
      max_oi: {
        type: "number",
        description: "Maximum open interest filter",
      },
      min_dte: {
        type: "number",
        description: "Minimum days to expiration",
      },
      max_dte: {
        type: "number",
        description: "Maximum days to expiration",
      },
      is_floor: {
        type: "boolean",
        description: "Filter for floor trades",
      },
      is_sweep: {
        type: "boolean",
        description: "Filter for sweep trades",
      },
      is_multi_leg: {
        type: "boolean",
        description: "Filter for multi-leg trades",
      },
      is_unusual: {
        type: "boolean",
        description: "Filter for unusual trades",
      },
      is_golden_sweep: {
        type: "boolean",
        description: "Filter for golden sweep trades",
      },
      side: {
        type: "string",
        description: "Trade side (call or put)",
        enum: ["call", "put"],
      },
      order: {
        type: "string",
        description: "Order direction",
        enum: ["asc", "desc"],
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
 * Handle flow tool requests.
 *
 * @param args - Tool arguments containing action and optional flow filters
 * @returns JSON string with flow data or error message
 */
export async function handleFlow(args: Record<string, unknown>): Promise<string> {
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
  } = args

  switch (action) {
    case "flow_alerts":
      return formatResponse(await uwFetch("/api/option-trades/flow-alerts", {
        date: date as string,
        ticker_symbol: ticker as string,
        limit: limit as number,
        min_premium: min_premium as number,
        max_premium: max_premium as number,
        min_size: min_size as number,
        max_size: max_size as number,
        min_oi: min_oi as number,
        max_oi: max_oi as number,
        min_dte: min_dte as number,
        max_dte: max_dte as number,
        is_floor: is_floor as boolean,
        is_sweep: is_sweep as boolean,
        is_multi_leg: is_multi_leg as boolean,
        is_unusual: is_unusual as boolean,
        is_golden_sweep: is_golden_sweep as boolean,
        side: side as string,
        order: order as string,
      }))

    case "full_tape":
      if (!date) return formatError("date is required")
      return formatResponse(await uwFetch(`/api/option-trades/full-tape/${encodePath(date)}`))

    case "net_flow_expiry":
      return formatResponse(await uwFetch("/api/net-flow/expiry", { date: date as string }))

    case "group_greek_flow":
      if (!flow_group) return formatError("flow_group is required")
      return formatResponse(await uwFetch(`/api/group-flow/${encodePath(flow_group)}/greek-flow`, { date: date as string }))

    case "group_greek_flow_expiry":
      if (!flow_group || !expiry) return formatError("flow_group and expiry are required")
      return formatResponse(await uwFetch(`/api/group-flow/${encodePath(flow_group)}/greek-flow/${encodePath(expiry)}`, { date: date as string }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
