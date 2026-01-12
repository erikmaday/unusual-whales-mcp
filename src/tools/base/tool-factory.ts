import type { ZodSchema } from "zod"
import type { ApiResponse } from "../../client.js"
import { formatZodError } from "../../schemas/index.js"
import { formatToolResponse, formatToolError, type ToolResponse } from "./response.js"

/**
 * Action handler function type
 * Takes the validated input data and returns an API response promise
 */
type ActionHandler<TInput> = (data: TInput) => Promise<ApiResponse>

/**
 * Map of action names to their handler functions
 */
type ActionHandlers<TInput> = {
  [K in TInput extends { action_type: infer A } ? A & string : never]: ActionHandler<
    Extract<TInput, { action_type: K }>
  >
}

/**
 * Create a tool handler function with automatic validation, routing, and error handling
 *
 * @param schema - Zod schema for input validation (should be discriminated union on 'type')
 * @param handlers - Map of action names to handler functions
 * @returns Tool handler function that validates input, routes to action handler, and formats response
 *
 * @example
 * ```typescript
 * const myToolSchema = z.discriminatedUnion("action_type", [
 *   z.object({ action_type: z.literal("action1"), ticker: tickerSchema }),
 *   z.object({ action_type: z.literal("action2"), date: dateSchema }),
 * ])
 *
 * export const handleMyTool = createToolHandler(
 *   myToolSchema,
 *   {
 *     action1: async (data) => uwFetch(`/api/endpoint/${encodePath(data.ticker)}`),
 *     action2: async (data) => uwFetch("/api/other", { date: data.date }),
 *   }
 * )
 * ```
 */
export function createToolHandler<TInput>(
  schema: ZodSchema<TInput>,
  handlers: ActionHandlers<TInput>,
): (args: Record<string, unknown>) => Promise<ToolResponse> {
  return async (args: Record<string, unknown>): Promise<ToolResponse> => {
    // Validate input
    const parsed = schema.safeParse(args)

    if (!parsed.success) {
      return formatToolError(`Invalid input: ${formatZodError(parsed.error)}`)
    }

    // Extract action from validated data
    const data = parsed.data as TInput & { action_type: string }
    const action = data.action_type

    // Get handler for this action
    const handler = handlers[action as keyof typeof handlers]

    if (!handler) {
      return formatToolError(`Unknown action: ${action}`)
    }

    try {
      // Execute handler and format response
      const result = await handler(data as never)
      return formatToolResponse(result)
    } catch (error) {
      // Handle unexpected errors
      const message = error instanceof Error ? error.message : String(error)
      return formatToolError(`Error executing ${action}: ${message}`)
    }
  }
}
