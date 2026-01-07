import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, formatZodError,
} from "../schemas.js"

const shortsActions = ["data", "ftds", "interest_float", "volume_ratio", "volumes_by_exchange"] as const

const shortsInputSchema = z.object({
  action: z.enum(shortsActions).describe("The action to perform"),
  ticker: tickerSchema,
})


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
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle shorts tool requests.
 *
 * @param args - Tool arguments containing action and ticker
 * @returns JSON string with short interest data or error message
 */
export async function handleShorts(args: Record<string, unknown>): Promise<string> {
  const parsed = shortsInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const { action, ticker } = parsed.data
  const safeTicker = encodePath(ticker)

  switch (action) {
    case "data":
      return formatResponse(await uwFetch(`/api/shorts/${safeTicker}/data`))

    case "ftds":
      return formatResponse(await uwFetch(`/api/shorts/${safeTicker}/ftds`))

    case "interest_float":
      return formatResponse(await uwFetch(`/api/shorts/${safeTicker}/interest-float`))

    case "volume_ratio":
      return formatResponse(await uwFetch(`/api/shorts/${safeTicker}/volume-and-ratio`))

    case "volumes_by_exchange":
      return formatResponse(await uwFetch(`/api/shorts/${safeTicker}/volumes-by-exchange`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
