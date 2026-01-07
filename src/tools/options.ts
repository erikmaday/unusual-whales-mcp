import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import {
  toJsonSchema,
  formatZodError,
  dateSchema,
  limitSchema,
  optionTypeSchema,
} from "../schemas.js"

const optionsActions = ["flow", "historic", "intraday", "volume_profile"] as const

const optionsInputSchema = z.object({
  action: z.enum(optionsActions).describe("The action to perform"),
  id: z.string().describe("Option contract ID/symbol (e.g., AAPL240119C00150000)"),
  // flow action parameters
  side: optionTypeSchema.describe("Trade side (call or put)").optional(),
  min_premium: z.number().nonnegative("Premium cannot be negative").describe("Minimum premium filter").optional(),
  limit: limitSchema.optional(),
  // date parameter used by flow, intraday, and volume_profile actions
  date: dateSchema.optional(),
})


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
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },
}

/**
 * Handle options tool requests.
 *
 * @param args - Tool arguments containing action and option contract ID
 * @returns JSON string with option contract data or error message
 */
export async function handleOptions(args: Record<string, unknown>): Promise<string> {
  const parsed = optionsInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(`Invalid input: ${formatZodError(parsed.error)}`)
  }

  const { action, id, side, min_premium, limit, date } = parsed.data
  const safeId = encodePath(id)

  switch (action) {
    case "flow":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/flow`, {
        side,
        min_premium,
        limit,
        date,
      }))

    case "historic":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/historic`, { limit }))

    case "intraday":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/intraday`, { date }))

    case "volume_profile":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/volume-profile`, { date }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
