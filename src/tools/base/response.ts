import type { ApiResponse } from "../../client.js"

/**
 * Unified tool response format
 */
export interface ToolResponse {
  text: string
  structuredContent?: unknown
}

/**
 * Format a successful API response into a unified tool response
 *
 * @param result - The API response from uwFetch
 * @returns Formatted tool response with both text and structured content
 */
export function formatToolResponse(result: ApiResponse): ToolResponse {
  if (result.error) {
    return {
      text: JSON.stringify({ error: result.error }, null, 2),
    }
  }

  return {
    text: JSON.stringify(result.data, null, 2),
    structuredContent: result.data,
  }
}

/**
 * Format an error message into a tool response
 *
 * @param message - The error message
 * @returns Formatted tool response with error text
 */
export function formatToolError(message: string): ToolResponse {
  return {
    text: JSON.stringify({ error: message }, null, 2),
  }
}
