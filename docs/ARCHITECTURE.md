# Architecture Documentation

## System Overview

The Unusual Whales MCP Server is a Model Context Protocol (MCP) server that provides AI assistants with access to comprehensive financial market data from the Unusual Whales API. The server implements robust reliability patterns including rate limiting, circuit breaking, and automatic retries.

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code (Client)                    │
│                         MCP Protocol                          │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (index.ts)                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Tool Registry & Router                   │  │
│  │  - 16 tools (stock, flow, market, screener, etc.)   │  │
│  │  - Schema validation (Zod)                           │  │
│  │  - Request routing to handlers                        │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Tool Handlers (tools/*.ts)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - Input validation (Zod schemas)                     │  │
│  │  - Parameter processing & encoding                    │  │
│  │  - API endpoint construction                          │  │
│  │  - Response formatting                                │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Client (client.ts)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  uwFetch() - Core HTTP client                         │  │
│  │    ├─ Rate Limiter (sliding window)                  │  │
│  │    ├─ Circuit Breaker (failure detection)            │  │
│  │    ├─ Retry Logic (exponential backoff)              │  │
│  │    └─ Error handling & formatting                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Unusual Whales REST API                      │
│                  (unusualwhales.com)                         │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. MCP Server (`src/index.ts`)

**Responsibilities:**
- Expose tools, resources, and prompts via MCP protocol
- Route tool calls to appropriate handlers
- Provide API documentation and usage examples

**Key Functions:**
- `server.setRequestHandler(ListToolsRequestSchema, ...)` - Register all 16 tools
- `server.setRequestHandler(CallToolRequestSchema, ...)` - Route tool calls to handlers
- `server.setRequestHandler(ListResourcesRequestSchema, ...)` - Provide API documentation resources
- `server.setRequestHandler(ListPromptsRequestSchema, ...)` - Expose reusable prompts

### 2. Tool Handlers (`src/tools/*.ts`)

Each tool file (e.g., `stock.ts`, `flow.ts`, `market.ts`) handles a specific category of API endpoints.

**Structure:**
```typescript
// 1. Schema definition (Zod discriminated union)
const toolInputSchema = z.discriminatedUnion("action", [
  actionSchema1,
  actionSchema2,
  // ...
])

// 2. Handler function
export async function handleTool(args: Record<string, unknown>): Promise<ToolResponse> {
  // Validate input
  const parsed = toolInputSchema.safeParse(args)
  if (!parsed.success) return { text: formatError(...) }

  // Route to action-specific logic
  switch (parsed.data.action) {
    case "action1": return await handleAction1(parsed.data)
    // ...
  }
}

// 3. Tool definition (MCP Tool type)
export const toolDefinition: Tool = {
  name: "uw_tool",
  description: "...",
  inputSchema: toJsonSchema(toolInputSchema),
  annotations: { readOnlyHint: true, idempotentHint: true }
}
```

**Current Tools (16):**
- `uw_stock` - Stock data, options chains, greeks, IV, OHLC
- `uw_options` - Option contract flow, historic, intraday
- `uw_market` - Market-wide tide, sector ETFs, calendars
- `uw_flow` - Options flow alerts, tape, greek flow
- `uw_darkpool` - Dark pool trades
- `uw_congress` - Congressional trading data
- `uw_insider` - Insider transactions
- `uw_institutions` - Institutional holdings
- `uw_earnings` - Earnings calendar and history
- `uw_etf` - ETF holdings and flows
- `uw_screener` - Stock and option screeners
- `uw_shorts` - Short interest and FTDs
- `uw_seasonality` - Historical performance patterns
- `uw_news` - News headlines
- `uw_alerts` - User alerts and configurations
- `uw_politicians` - Politician portfolios and trades

### 3. API Client (`src/client.ts`)

**Core Function: `uwFetch()`**

Handles all HTTP communication with the Unusual Whales API, integrating three reliability patterns:

```typescript
export async function uwFetch(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<ApiResponse>
```

**Reliability Patterns:**

#### Rate Limiter (`src/rate-limiter.ts`)
- **Algorithm**: Sliding window with configurable window size and max requests
- **Default**: 120 requests per minute
- **Behavior**: Queues requests when rate limit reached, releases when window slides
- **Purpose**: Prevent API rate limit errors (429 responses)

```typescript
class RateLimiter {
  private requests: number[] = []  // Timestamps of requests
  private queue: Array<() => void> = []  // Queued requests

  async acquire(): Promise<void> {
    // Remove requests outside window
    // If under limit, proceed immediately
    // Otherwise, queue and wait
  }
}
```

#### Circuit Breaker (`src/circuit-breaker.ts`)
- **States**: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
- **Thresholds**: 5 failures triggers OPEN, 30s timeout before HALF_OPEN
- **Purpose**: Prevent cascading failures, fail fast when API is down

```typescript
class CircuitBreaker {
  private state: State = State.CLOSED
  private failureCount = 0
  private lastFailureTime: number | null = null

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // OPEN: reject immediately
    // HALF_OPEN: allow one request to test
    // CLOSED: proceed normally
    // Update state based on result
  }
}
```

#### Retry Logic
- **Strategy**: Exponential backoff with jitter
- **Retries**: 3 attempts for rate limits (429) and server errors (5xx)
- **Backoff**: 1s, 2s, 4s with random jitter
- **Purpose**: Handle transient API failures gracefully

### 4. Schema Validation (`src/schemas/*.ts`)

**Zod Schemas** provide runtime validation with TypeScript type inference:

```typescript
// Common schemas
const tickerSchema = z.string().min(1).max(10)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const limitSchema = z.number().int().min(1).max(500)

// Filter schemas
const premiumFilterSchema = z.object({
  min_premium: z.number().int().nonnegative().default(0).optional(),
  max_premium: z.number().int().nonnegative().optional(),
})

// Tool input schema (discriminated union)
const stockInputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("info"), ticker: tickerSchema }),
  z.object({ action: z.literal("ohlc"), ticker: tickerSchema, candle_size: candleSizeSchema }),
  // ... 38 more actions
])
```

**Benefits:**
- Runtime validation catches invalid inputs
- TypeScript types derived from schemas (single source of truth)
- Clear error messages for validation failures
- JSON Schema generation for MCP protocol

## Request Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Claude Code sends MCP tool call                          │
│    { name: "uw_stock", arguments: { action: "info", ... } } │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. MCP Server receives CallToolRequest                      │
│    - Look up tool name in registry                          │
│    - Route to appropriate handler                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Tool Handler validates input                             │
│    - Parse arguments with Zod schema                        │
│    - Return error if validation fails                       │
│    - Extract action and parameters                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Construct API request                                    │
│    - Build endpoint path with encoded parameters            │
│    - Add query parameters                                   │
│    - Call uwFetch()                                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Rate Limiter checks capacity                             │
│    - Count requests in sliding window                       │
│    - Queue if over limit, proceed if under                  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Circuit Breaker checks state                             │
│    - OPEN: fail immediately                                 │
│    - HALF_OPEN: allow test request                          │
│    - CLOSED: proceed with request                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. HTTP request to Unusual Whales API                       │
│    - Set Authorization header (API key)                     │
│    - Set Accept: application/json                           │
│    - Send GET/POST request                                  │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Handle response                                           │
│    - Success (200): update circuit breaker, return data     │
│    - Rate limit (429): retry with backoff                   │
│    - Server error (5xx): retry with backoff                 │
│    - Client error (4xx): return error, no retry             │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. Format response                                           │
│    - Success: { text: JSON, structuredContent: data }       │
│    - Error: { text: JSON error message }                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Return to Claude Code                                   │
│     MCP CallToolResult with content                         │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Strategy

### Validation Errors (Client-side)

**Where**: Tool handler schema validation
**When**: Invalid input parameters (wrong type, missing required, out of range)
**Response**: Immediate error, no API call

```typescript
// Example: Missing required parameter
{
  "error": "ticker is required for info action"
}

// Example: Invalid parameter format
{
  "error": "date must be in YYYY-MM-DD format"
}
```

### Rate Limit Errors (429)

**Where**: API client
**Strategy**: Automatic retry with exponential backoff
**Retries**: 3 attempts (1s, 2s, 4s delays)
**User Impact**: Transparent (request just takes longer)

### Server Errors (5xx)

**Where**: API client
**Strategy**: Automatic retry with exponential backoff
**Retries**: 3 attempts
**Circuit Breaker**: Failures count toward circuit breaker threshold

### Circuit Breaker Open

**Where**: Circuit breaker check
**When**: 5+ consecutive failures within timeout window
**Response**: Fail fast without API call
**Recovery**: After 30s timeout, enter HALF_OPEN state for test request

```typescript
{
  "error": "Service temporarily unavailable (circuit breaker open). The API may be experiencing issues. Please try again in a moment."
}
```

### Client Errors (4xx)

**Where**: API response handling
**Strategy**: No retry (these are permanent errors)
**Common Cases**:
- 400 Bad Request: Invalid API parameters
- 401 Unauthorized: Invalid/missing API key
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Invalid endpoint or resource

## Design Decisions and Trade-offs

### 1. Discriminated Unions vs. Multiple Tools

**Decision**: Single tool per category (e.g., `uw_stock`) with action parameter
**Alternative**: Separate tool for each action (e.g., `uw_stock_info`, `uw_stock_ohlc`)

**Rationale:**
- ✅ Fewer tools to discover (16 vs. 100+)
- ✅ Logical grouping by data category
- ✅ Easier to maintain schemas
- ❌ Slightly more complex input validation

### 2. Schema Composition vs. Explicit Schemas

**Current State**: Mixed approach with some composition
**Planned Change**: Explicit per-action schemas

**Rationale:**
- ✅ 1:1 mirror of Unusual Whales API (not always consistent)
- ✅ Dramatically simplifies API sync validation
- ✅ Zero ambiguity about what each action accepts
- ✅ Self-documenting (schema IS the specification)
- ❌ More schema code (but much clearer)

### 3. Circuit Breaker Thresholds

**Decision**: 5 failures, 30s timeout, 1 test request in HALF_OPEN

**Rationale:**
- 5 failures: Distinguishes sustained outage from transient issues
- 30s timeout: Balances recovery speed vs. API load
- 1 test request: Minimizes load while testing recovery

**Trade-offs:**
- More aggressive (lower threshold): Fails faster but more false positives
- More conservative (higher threshold): More tolerance but slower to detect outages

### 4. Rate Limiting Strategy

**Decision**: Client-side rate limiting with queue (not just reject)

**Rationale:**
- ✅ Prevents 429 errors proactively
- ✅ Queuing provides better UX than immediate rejection
- ✅ Configurable per environment
- ❌ Adds latency when rate limit reached

### 5. Response Format

**Current**: Mixed (some tools return string, some return structured)
**Planned**: Unified `{ text: string, structuredContent?: unknown }`

**Rationale:**
- ✅ Consistent API surface
- ✅ Supports both text and structured consumers
- ✅ Future-proof for additional metadata

## Configuration

### Environment Variables

#### Required

- **`UW_API_KEY`**: Your Unusual Whales API key
  - Get from: https://unusualwhales.com/developers
  - Format: String (no special validation)
  - Used in: `Authorization: Bearer ${UW_API_KEY}` header

#### Optional

- **`UW_API_BASE_URL`**: Override base API URL (default: `https://api.unusualwhales.com`)
  - Use case: Testing, local development, different API environment
  - Example: `UW_API_BASE_URL=https://api-staging.unusualwhales.com`

- **`UW_RATE_LIMIT_MAX`**: Maximum requests per window (default: 120)
  - Range: 1-1000 (practical limits)
  - Use case: Adjust based on API tier, or reduce to be more conservative

- **`UW_RATE_LIMIT_WINDOW_MS`**: Rate limit window in milliseconds (default: 60000 = 1 minute)
  - Range: 1000-300000 (1s-5min practical range)
  - Use case: Match API's rate limit window

- **`UW_CIRCUIT_BREAKER_THRESHOLD`**: Failures before circuit opens (default: 5)
  - Range: 1-50
  - Use case: More/less aggressive circuit breaking

- **`UW_CIRCUIT_BREAKER_TIMEOUT`**: Time in ms before testing recovery (default: 30000 = 30s)
  - Range: 5000-300000 (5s-5min)
  - Use case: Faster/slower recovery attempts

- **`UW_MAX_RETRIES`**: Maximum retry attempts (default: 3)
  - Range: 0-10
  - Use case: 0 for no retries, higher for more tolerance

### Configuration in Code

```typescript
// client.ts
const API_KEY = process.env.UW_API_KEY
const BASE_URL = process.env.UW_API_BASE_URL || "https://api.unusualwhales.com"

// rate-limiter.ts
const rateLimiter = new RateLimiter(
  parseInt(process.env.UW_RATE_LIMIT_MAX || "120"),
  parseInt(process.env.UW_RATE_LIMIT_WINDOW_MS || "60000")
)

// circuit-breaker.ts
const circuitBreaker = new CircuitBreaker(
  parseInt(process.env.UW_CIRCUIT_BREAKER_THRESHOLD || "5"),
  parseInt(process.env.UW_CIRCUIT_BREAKER_TIMEOUT || "30000")
)
```

## Testing Strategy

### Unit Tests (`tests/unit/`)

**Purpose**: Test individual components in isolation

**Coverage**:
- Schema validation (all valid and invalid cases)
- Rate limiter algorithm (sliding window edge cases)
- Circuit breaker state machine (all transitions)
- Tool handlers (all actions, parameter combinations)
- Utility functions (path encoding, response formatting)

**Mocking**: `uwFetch` is mocked to avoid real API calls

### Integration Tests (`tests/integration/`)

**Purpose**: Test end-to-end request/response cycles

**Coverage**:
- Full MCP protocol flow (CallToolRequest → CallToolResult)
- Multiple tools in sequence
- Error handling (circuit breaker, rate limiting, retries)
- Resource retrieval

**Mocking**: HTTP layer (not `uwFetch`) to test client.ts logic

### API Sync Validation (`scripts/check-api-sync.js`)

**Purpose**: Ensure MCP schemas match Unusual Whales OpenAPI spec

**Process**:
1. Fetch latest OpenAPI spec from Unusual Whales
2. Extract endpoint parameters from spec
3. Extract schema parameters from Zod schemas
4. Compare required fields, types, constraints
5. Report mismatches

**Automation**: Runs in CI on PRs, scheduled daily

## Performance Characteristics

### Latency

- **Best case**: ~100-200ms (API latency only)
- **Rate limited**: +0-60s (queue time when rate limit reached)
- **With retries**: +1-7s (exponential backoff on errors)
- **Circuit breaker open**: <1ms (immediate rejection)

### Memory

- **Base**: ~50-100MB (Node.js + dependencies)
- **Per request**: ~1-10KB (request/response data)
- **Rate limiter**: ~10KB (120 timestamps max)
- **Circuit breaker**: ~1KB (failure count and timestamps)

### Concurrency

- **Rate limiter**: Thread-safe queue (handles concurrent requests)
- **Circuit breaker**: Atomic state transitions
- **HTTP client**: Uses Node.js fetch (connection pooling)

## Monitoring and Observability

### Logging

**Current**: Console logs in development
**Recommended Production**:
- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Include: request ID, tool name, action, latency, status

### Metrics to Track

- **Request rate**: Requests per minute (by tool, action)
- **Error rate**: Errors per minute (by type: 4xx, 5xx, validation)
- **Latency**: p50, p95, p99 latency (by tool, action)
- **Circuit breaker**: State transitions, time in OPEN state
- **Rate limiter**: Queue depth, queue wait time

### Health Checks

**Circuit Breaker State**: Monitor for frequent OPEN states
**Rate Limit Queue**: Monitor for sustained queue buildup
**Error Patterns**: Alert on spike in 4xx/5xx errors

## Security Considerations

### API Key Management

- **Never commit**: API key must be in environment variable
- **Rotation**: Support key rotation (restart required)
- **Validation**: Server validates API key presence on startup

### Input Validation

- **All inputs validated**: Zod schemas reject malformed data
- **Path parameter encoding**: Prevents path traversal attacks
- **SQL injection**: N/A (REST API, no direct DB access)
- **XSS**: N/A (no HTML rendering, JSON responses only)

### Rate Limiting

- **Protection**: Prevents abuse of Unusual Whales API quota
- **Per-instance**: Each server instance has own rate limit (consider shared state for multi-instance)

## Future Enhancements

### Short-term (Next 3-6 months)

1. **Tool Factory Pattern**: Eliminate 1,800+ lines of boilerplate
2. **Explicit Per-Action Schemas**: Simplify API sync validation
3. **Enhanced Documentation**: Architecture, troubleshooting, examples
4. **Increased Test Coverage**: 85%+ with CI enforcement
5. **Unified Response Format**: Consistent structured responses

### Long-term (6-12 months)

1. **Caching Layer**: Cache frequently accessed data (stock info, option chains)
2. **Batch Operations**: Support multiple tickers in single request
3. **WebSocket Support**: Real-time data streams (if API supports)
4. **Request Prioritization**: Priority queue for time-sensitive requests
5. **Multi-instance Coordination**: Shared rate limiter for horizontal scaling

## Getting Help

- **Documentation**: See `docs/TROUBLESHOOTING.md` for common issues
- **Contributing**: See `CONTRIBUTING.md` for development guide
- **Issues**: Report bugs at https://github.com/anthropics/unusual-whales-mcp/issues
- **API Questions**: Unusual Whales docs at https://docs.unusualwhales.com
