# Contributing to Unusual Whales MCP

Thanks for your interest in contributing!

## Development Setup

```bash
git clone https://github.com/erikmaday/unusual-whales-mcp.git
cd unusual-whales-mcp
npm install
npm run dev  # Watch mode
```

## Project Structure

```
src/
├── index.ts        # MCP server entry point
├── client.ts       # API client (uwFetch, formatResponse, encodePath)
├── schemas.ts      # Shared Zod schemas for parameter validation
├── rate-limiter.ts # Sliding window rate limiter
├── logger.ts       # Stderr JSON logger
└── tools/          # Tool modules (one per API domain)
    ├── index.ts    # Tool registration
    ├── stock.ts
    ├── flow.ts
    └── ...
```

## Adding a New Tool

1. Create `src/tools/mytool.ts`:

```typescript
import { z } from "zod"
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"
import { toJsonSchema, tickerSchema, dateSchema, formatZodError } from "../schemas.js"

const myToolActions = ["action1", "action2"] as const

const myToolInputSchema = z.object({
  action: z.enum(myToolActions).describe("The action to perform"),
  ticker: tickerSchema.optional(),
  date: dateSchema.optional(),
})

export const myTool = {
  name: "uw_mytool",
  description: `Description of what this tool does.

Available actions:
- action1: Description (required params)
- action2: Description (optional params)`,
  inputSchema: toJsonSchema(myToolInputSchema),
}

export async function handleMyTool(args: Record<string, unknown>): Promise<string> {
  const parsed = myToolInputSchema.safeParse(args)
  if (!parsed.success) {
    return formatError(formatZodError(parsed.error))
  }

  const { action, ticker, date } = parsed.data

  switch (action) {
    case "action1":
      if (!ticker) return formatError("ticker is required for action1")
      return formatResponse(await uwFetch(`/api/endpoint/${encodePath(ticker)}`))

    case "action2":
      return formatResponse(await uwFetch("/api/other", { date }))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
```

2. Register in `src/tools/index.ts`:

```typescript
import { myTool, handleMyTool } from "./mytool.js"

const toolRegistrations: ToolRegistration[] = [
  // ... existing tools
  { tool: myTool, handler: handleMyTool },
]
```

## Checking for API Changes

The UnusualWhales API may add new endpoints. To check:

```bash
npm run check-api
```

This fetches the live OpenAPI spec and compares against implemented endpoints.

## Code Style

Code style is enforced via ESLint. Run the linter before submitting:

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

**Key rules enforced:**
- No semicolons
- Trailing commas in multiline
- Explicit return types on functions

**Best practices:**
- Use `formatError()` for validation errors
- Use `encodePath()` for all URL path parameters
- Add JSDoc comments to handler functions

## Pull Request Guidelines

1. Run `npm run lint` to ensure code style compliance
2. Run `npm run build` to ensure no TypeScript errors
3. Run `npm run check-api` to verify API coverage
4. Keep PRs focused on a single change

## Reporting Issues

- Check existing issues first
- Include steps to reproduce
- Include error messages if applicable
