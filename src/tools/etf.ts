import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, formatZodError,
} from "../schemas/index.js"

const etfActions = ["info", "holdings", "exposure", "in_outflow", "weights"] as const

const etfInputSchema = z.object({
  action: z.enum(etfActions).describe("The action to perform"),
  ticker: tickerSchema.describe("ETF ticker symbol (e.g., SPY, QQQ)"),
})


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
 * Handle ETF tool requests.
 *
 * @param args - Tool arguments containing action and ticker
 * @returns JSON string with ETF data or error message
 */
export async function handleEtf(args: Record<string, unknown>): Promise<string> {
  const parsed = etfInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const { action, ticker } = parsed.data
  const safeTicker = encodePath(ticker)

  switch (action) {
    case "info":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/info`))

    case "holdings":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/holdings`))

    case "exposure":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/exposure`))

    case "in_outflow":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/in-outflow`))

    case "weights":
      return formatResponse(await uwFetch(`/api/etfs/${safeTicker}/weights`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
