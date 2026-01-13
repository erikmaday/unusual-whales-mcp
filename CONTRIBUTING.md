# Contributing to Unusual Whales MCP

Thanks for your interest in contributing!

## Development Setup

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/erikmaday/unusual-whales-mcp.git
cd unusual-whales-mcp
npm install

# 2. Set up API key
export UW_API_KEY="your_api_key_here"
# Or add to ~/.zshrc or ~/.bashrc for permanent setup

# 3. Build and test
npm run build
npm test

# 4. Development with watch mode
npm run dev  # Rebuilds on file changes
```

### Testing in Claude Code

After building, test the MCP server in Claude Code:

1. **Add to Claude Code configuration**:
   ```json
   {
     "mcpServers": {
       "unusual-whales": {
         "command": "node",
         "args": ["/path/to/unusual-whales-mcp/dist/index.js"],
         "env": {
           "UW_API_KEY": "your_api_key_here"
         }
       }
     }
   }
   ```

2. **Restart Claude Code** to load the MCP server

3. **Test with prompts**:
   ```
   "Get info for AAPL stock"
   "Show me recent options flow for SPY"
   "What are the latest congressional trades?"
   ```

4. **Verify tool execution** in the conversation

### Using MCP Inspector

The MCP Inspector provides a visual interface for testing tools:

```bash
# 1. Build the server
npm run build

# 2. Start MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js

# 3. Open browser to http://localhost:5173
```

**What you can do:**
- List all tools
- Inspect tool schemas
- Test tool execution with real parameters
- View formatted responses
- Debug validation errors

**Common workflows:**
```
1. Select tool (e.g., "uw_stock")
2. Choose action (e.g., "info")
3. Fill parameters (e.g., ticker: "AAPL")
4. Click "Execute"
5. View response data
```

This is especially helpful for:
- Testing new tools before integrating with Claude Code
- Debugging parameter validation
- Verifying API responses
- Exploring tool capabilities

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

## Resilience Features

The server includes several features to handle API issues gracefully. These are configured via environment variables.

### Rate Limiting

A sliding window rate limiter prevents exceeding API limits. Default is 120 requests/minute (matching the Unusual Whales API limit). Adjust with `UW_RATE_LIMIT_PER_MINUTE` if your plan has different limits.

### Retries

Failed requests (5xx errors, network timeouts) automatically retry with exponential backoff:
- 1st retry after 1 second
- 2nd retry after 2 seconds
- 3rd retry after 4 seconds

Client errors (4xx) are not retried since they indicate bad input. Set `UW_MAX_RETRIES=0` to disable retries entirely.

### Circuit Breaker

Protects against cascading failures when the API is down:

- **CLOSED** (normal): Requests go through normally
- **OPEN** (failing fast): After `UW_CIRCUIT_BREAKER_THRESHOLD` consecutive failures (default 5), requests immediately fail without hitting the API
- **HALF_OPEN** (testing): After `UW_CIRCUIT_BREAKER_RESET_TIMEOUT` ms (default 30000), allows test requests through. Two successes close the circuit; any failure reopens it.

This prevents hammering a broken API and lets it recover.

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

## Keeping Up with API Changes

The Unusual Whales API evolves over time - new endpoints get added, parameters change, and occasionally things get deprecated. We have a sync checker that helps us stay on top of this.

### Running the Check

```bash
npm run check-api                         # Standard check
CREATE_ISSUES=true npm run check-api      # Also create GitHub issues for problems
```

This compares what we've implemented against the official OpenAPI spec and tells you about any gaps.

### What It Actually Does

The checker reads through our tool files and the OpenAPI spec, then figures out:

1. **Missing endpoints** - Things in the spec we haven't implemented yet
2. **Extra endpoints** - Things we've implemented that aren't in the spec (usually means something got deprecated or renamed)
3. **Parameter mismatches** - When our schemas don't quite match what the API expects

It's not magic - it parses our discriminated union schemas and handler code to map actions to API endpoints, then compares the parameters against the spec. The matching is smart enough to handle things like `param[]` array notation differences.

### Automated Daily Checks

A GitHub Action runs this every morning at 9am UTC. If it finds issues, it creates GitHub issues so nothing slips through the cracks. You can also trigger it manually from the Actions tab if you want to check after a known API update.

The workflow:
1. Fetches the latest OpenAPI spec from Unusual Whales
2. Commits any spec changes to the repo
3. Runs the sync check
4. Creates issues for any problems found

### Ignoring Endpoints

Some endpoints we intentionally skip - WebSocket streams, deprecated routes, etc. These live in the `IGNORED_ENDPOINTS` array at the top of `scripts/check-api-sync.js`. If you're wondering why something isn't flagged as missing, check there first.

### When the Check Fails

If the check fails in CI:

- **Missing required params**: We need to add them to the action schema
- **Missing optional params**: Probably worth adding, but not urgent
- **Extra params**: Either the API changed or we have a typo - investigate
- **Missing endpoints**: New API feature! Consider implementing it

The check runs on every PR, so you'll catch issues before they hit main.

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

## Testing Strategy

We maintain high test coverage (85%+) to ensure reliability.

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test stock.test.ts

# Watch mode (reruns on file changes)
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

### Test Coverage Requirements

- **Overall**: ≥85% coverage (lines, statements, functions, branches)
- **New features**: 100% coverage for new code
- **Bug fixes**: Add test that would have caught the bug

Coverage is checked in CI before publishing. PRs that reduce coverage below 85% will be blocked.

### Writing Tests

#### Unit Tests (`tests/unit/`)

Test individual components in isolation:

```typescript
import { describe, it, expect, vi } from "vitest"
import { handleStock, stockTool } from "../../../src/tools/stock.js"

// Mock external dependencies
vi.mock("../../../src/client.js", () => ({
  uwFetch: vi.fn(),
  formatResponse: vi.fn((result) => JSON.stringify(result.data)),
}))

describe("handleStock", () => {
  it("validates required parameters", async () => {
    const result = await handleStock({ action: "info" })  // Missing ticker
    expect(result.text).toContain("ticker is required")
  })

  it("calls uwFetch with correct endpoint", async () => {
    await handleStock({ action: "info", ticker: "AAPL" })
    expect(uwFetch).toHaveBeenCalledWith("/api/stock/AAPL/info", {})
  })
})
```

**What to test:**
- Input validation (all required/optional parameters)
- Boundary conditions (min/max values, empty strings)
- Error handling (invalid inputs, API errors)
- Endpoint construction (correct paths, query params)

**What NOT to test:**
- External API behavior (mock `uwFetch`)
- Network failures (tested in integration tests)

#### Integration Tests (`tests/integration/`)

Test end-to-end request/response cycles:

```typescript
import { describe, it, expect } from "vitest"
import { tools, handlers } from "../../src/tools/index.js"

describe("End-to-End Flow", () => {
  it("successfully handles complete request cycle", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "ticker_exchanges" })

    expect(result).toHaveProperty("text")
    expect(() => JSON.parse(result.text)).not.toThrow()
  })

  it("handles validation errors gracefully", async () => {
    const handler = handlers["uw_stock"]
    const result = await handler({ action: "invalid_action" })

    const parsed = JSON.parse(result.text)
    expect(parsed.error).toBeDefined()
  })
})
```

**What to test:**
- Complete tool execution flow
- Error propagation through layers
- Response format consistency
- Multiple tools in sequence

### Test Best Practices

1. **Use descriptive test names**
   ```typescript
   // ❌ Bad
   it("works")

   // ✅ Good
   it("rejects empty ticker with validation error")
   ```

2. **Test one thing per test**
   ```typescript
   // ❌ Bad: Tests multiple things
   it("handles stock data", () => {
     // Tests validation AND API call AND response format
   })

   // ✅ Good: Separate tests
   it("validates required ticker parameter", () => { /* ... */ })
   it("calls correct API endpoint", () => { /* ... */ })
   it("formats response correctly", () => { /* ... */ })
   ```

3. **Mock at the right level**
   ```typescript
   // ✅ Mock uwFetch (tests tool logic)
   vi.mock("../src/client.js", () => ({ uwFetch: vi.fn() }))

   // ❌ Don't mock fetch (prevents testing client.ts)
   ```

4. **Avoid testing implementation details**
   ```typescript
   // ❌ Bad: Tests internal variable names
   expect(result.internalVar).toBe("value")

   // ✅ Good: Tests public behavior
   expect(result.text).toContain("expected output")
   ```

## Schema Development Patterns

### Use Discriminated Unions

All tool schemas use discriminated unions for type-safe action routing:

```typescript
// Define action-specific schemas
const infoSchema = z.object({
  action: z.literal("info"),
  ticker: tickerSchema,
})

const ohlcSchema = z.object({
  action: z.literal("ohlc"),
  ticker: tickerSchema,
  candle_size: candleSizeSchema,
  date: dateSchema.optional(),
})

// Combine with discriminated union
const stockInputSchema = z.discriminatedUnion("action", [
  infoSchema,
  ohlcSchema,
  // ... more actions
])
```

**Benefits:**
- TypeScript narrows type based on action
- No manual `if (!param)` checks needed
- Validation errors show exact requirements
- Easy to add/remove actions

### Schema Organization

```typescript
// 1. Import common schemas
import { tickerSchema, dateSchema, limitSchema } from "../schemas/index.js"

// 2. Define tool-specific schemas (if needed)
const candleSizeSchema = z.enum(["1m", "5m", "15m", "1h", "4h", "1d"])

// 3. Define action schemas (explicit, self-contained)
const actionSchema = z.object({
  action: z.literal("action_name"),
  // List ALL parameters explicitly (no composition)
  param1: z.string(),
  param2: z.number().optional(),
  // ...
})

// 4. Combine into discriminated union
const toolInputSchema = z.discriminatedUnion("action", [schemas])

// 5. Export tool definition
export const tool = {
  name: "uw_tool",
  description: "...",
  inputSchema: toJsonSchema(toolInputSchema),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
}
```

### Schema Best Practices

1. **Be explicit over DRY**
   ```typescript
   // ✅ Good: Explicit (easy to understand and validate)
   const schema = z.object({
     action: z.literal("info"),
     ticker: z.string().min(1).max(10),
     date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
   })

   // ❌ Avoid: Composition (harder to understand what's included)
   const schema = baseSchema
     .merge(tickerSchema)
     .merge(dateSchema)
     .refine(/* complex validation */)
   ```

2. **Use literal actions**
   ```typescript
   // ✅ Good: Type-safe literal
   action: z.literal("info")

   // ❌ Bad: String enum (no type narrowing)
   action: z.enum(["info", "ohlc", "greeks"])
   ```

3. **Add descriptions**
   ```typescript
   const schema = z.object({
     ticker: z.string()
       .min(1).max(10)
       .describe("Stock ticker symbol (e.g., AAPL, MSFT)"),
     limit: z.number()
       .int().min(1).max(500)
       .describe("Maximum number of results to return"),
   })
   ```

4. **Use defaults sparingly**
   ```typescript
   // ✅ Good: Reasonable default
   limit: z.number().int().min(1).max(500).default(100).optional()

   // ❌ Bad: Default changes behavior
   include_expired: z.boolean().default(true).optional()  // Surprising!
   ```

## Release Process

### Version Management

We use semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes (schema changes, removed features)
- **MINOR**: New features (new tools, new actions)
- **PATCH**: Bug fixes, documentation updates

### Publishing Workflow

1. **Create a release PR**
   ```bash
   # Update version in package.json
   npm version minor  # or major/patch

   # Push version commit and tag
   git push && git push --tags
   ```

2. **CI validates the release**
   - Runs all tests (must pass)
   - Checks coverage (must be ≥85%)
   - Validates API sync (must pass)
   - Runs lint (must pass)
   - Builds successfully

3. **Automatic publish to npm**
   - GitHub Actions publishes on tag push
   - Creates GitHub release with notes

### Pre-release Checklist

Before creating a release:

- [ ] All tests passing (`npm test`)
- [ ] Coverage ≥85% (`npm run test:coverage`)
- [ ] API sync passing (`npm run check-api`)
- [ ] Lint passing (`npm run lint`)
- [ ] Build successful (`npm run build`)
- [ ] Manual testing in Claude Code
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json

### Breaking Changes

If making breaking changes:

1. **Document in CHANGELOG**:
   ```markdown
   ## [2.0.0] - 2024-01-15

   ### BREAKING CHANGES
   - `uw_stock` action `get_info` renamed to `info`
   - Removed deprecated `uw_legacy` tool

   ### Migration Guide
   - Update action name: `get_info` → `info`
   - Replace `uw_legacy` usage with `uw_stock`
   ```

2. **Update major version**:
   ```bash
   npm version major  # 1.0.0 → 2.0.0
   ```

3. **Notify users**:
   - GitHub release notes
   - Migration guide in docs

## Pull Request Guidelines

Before submitting a PR:

1. **Run full validation suite**:
   ```bash
   npm run validate  # Runs lint, build, test
   ```

2. **Ensure tests pass**:
   ```bash
   npm test
   npm run test:coverage  # Check coverage ≥85%
   ```

3. **Check API sync**:
   ```bash
   npm run check-api
   ```

4. **Update documentation** (if needed):
   - Add JSDoc comments for new functions
   - Update README.md for new features
   - Update CHANGELOG.md

5. **Keep PRs focused**:
   - One feature or bug fix per PR
   - Small, reviewable changes
   - Clear commit messages

6. **PR description checklist**:
   - [ ] Describe what changed and why
   - [ ] Link related issues
   - [ ] Note breaking changes (if any)
   - [ ] Add screenshots (if UI/UX changes)
   - [ ] Confirm tests added/updated

### PR Review Process

1. **Automated checks** (must pass):
   - Tests
   - Coverage
   - Lint
   - Build
   - API sync

2. **Code review** (1+ approvals required):
   - Code quality
   - Test coverage
   - Documentation
   - Breaking changes noted

3. **Merge**:
   - Squash and merge (clean history)
   - Delete branch after merge

## Reporting Issues

When reporting bugs or requesting features:

1. **Check existing issues** first to avoid duplicates

2. **Use issue templates**:
   - Bug report: For unexpected behavior
   - Feature request: For new capabilities

3. **Include context**:
   - Version (from `npm list @unusualwhales/mcp-server`)
   - Environment (Node.js version, OS, Claude Code version)
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Error messages (redact API keys!)

4. **Be specific**:
   ```markdown
   # ❌ Bad issue
   "It doesn't work"

   # ✅ Good issue
   "uw_stock info action returns 401 error for valid API key on Node 20.10.0"
   ```

## Getting Help

- **Documentation**: See `docs/ARCHITECTURE.md` and `docs/TROUBLESHOOTING.md`
- **Issues**: https://github.com/erikmaday/unusual-whales-mcp/issues
- **Discussions**: For questions and ideas
