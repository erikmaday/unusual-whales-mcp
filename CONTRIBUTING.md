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
├── index.ts      # MCP server entry point
├── client.ts     # API client (uwFetch, formatResponse, encodePath)
└── tools/        # Tool modules (one per API domain)
    ├── stock.ts
    ├── flow.ts
    └── ...
```

## Adding a New Tool

1. Create `src/tools/mytool.ts`:

```typescript
import { uwFetch, formatResponse, encodePath, formatError } from "../client.js"

export const myTool = {
  name: "uw_mytool",
  description: `Description of what this tool does.

Available actions:
- action1: Description (required params)
- action2: Description (optional params)`,
  inputSchema: {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["action1", "action2"],
      },
      // Add other parameters...
    },
    required: ["action"],
  },
}

export async function handleMyTool(args: Record<string, unknown>): Promise<string> {
  const { action, ...params } = args

  switch (action) {
    case "action1":
      // Always validate required params
      if (!params.required_param) return formatError("required_param is required")
      // Use encodePath() for URL path segments
      return formatResponse(await uwFetch(`/api/endpoint/${encodePath(params.id)}`))

    default:
      return formatError(`Unknown action: ${action}`)
  }
}
```

2. Register in `src/index.ts`:

```typescript
import { myTool, handleMyTool } from "./tools/mytool.js"

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
