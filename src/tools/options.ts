import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, formatZodError,
} from "../schemas.js"

const optionsActions = ["flow", "historic", "intraday", "volume_profile"] as const

const optionsInputSchema = z.object({
  action: z.enum(optionsActions).describe("The action to perform"),
  id: z.string().describe("Option contract ID/symbol (e.g., AAPL240119C00150000)"),
})


export const optionsTool = {
  name: "uw_options",
  description: `Access UnusualWhales option contract data including flow, historic prices, intraday data, and volume profiles.

Available actions:
- flow: Get option contract flow (id required)
- historic: Get historic option contract data (id required)
- intraday: Get intraday option contract data (id required)
- volume_profile: Get volume profile for option contract (id required)

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

  const { action, id } = parsed.data
  const safeId = encodePath(id)

  switch (action) {
    case "flow":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/flow`))

    case "historic":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/historic`))

    case "intraday":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/intraday`))

    case "volume_profile":
      return formatResponse(await uwFetch(`/api/option-contract/${safeId}/volume-profile`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
