# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Unusual Whales MCP Server.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Debugging Tools](#debugging-tools)
4. [Testing Best Practices](#testing-best-practices)
5. [API Sync Issues](#api-sync-issues)
6. [Performance Issues](#performance-issues)
7. [Getting More Help](#getting-more-help)

## Quick Diagnostics

Before diving into specific issues, run these quick checks:

```bash
# 1. Verify installation
npm run build
# Should complete without errors

# 2. Check API key is set
echo $UW_API_KEY
# Should print your API key (not empty)

# 3. Run tests to verify setup
npm test
# Should show all tests passing

# 4. Test with MCP Inspector (see Debugging Tools section)
npx @modelcontextprotocol/inspector node dist/index.js
```

If any of these fail, see the relevant section below.

## Common Issues

### 1. Circuit Breaker Open

**Symptoms:**
- Error message: "Service temporarily unavailable (circuit breaker open)"
- Requests fail immediately without trying API
- Happens after several consecutive failures

**Cause:**
The circuit breaker opened after detecting 5+ consecutive API failures. This prevents overwhelming the API with requests when it's experiencing issues.

**Solutions:**

**A. Wait for automatic recovery (30 seconds)**
```bash
# The circuit breaker will automatically transition to HALF_OPEN after 30s
# Wait 30 seconds and try again
```

**B. Check if Unusual Whales API is down**
```bash
# Test the API directly
curl -H "Authorization: Bearer $UW_API_KEY" \
  https://api.unusualwhales.com/api/stock/AAPL/info

# Check Unusual Whales status page
# Visit: https://status.unusualwhales.com (if available)
```

**C. Verify your API key is valid**
```bash
# Test authentication
curl -H "Authorization: Bearer $UW_API_KEY" \
  https://api.unusualwhales.com/api/stock/AAPL/info

# If you get 401 Unauthorized, your API key is invalid
```

**D. Adjust circuit breaker settings (if needed)**
```bash
# Make circuit breaker less aggressive (more tolerant of failures)
export UW_CIRCUIT_BREAKER_THRESHOLD=10  # Default is 5
export UW_CIRCUIT_BREAKER_TIMEOUT=60000  # Default is 30000 (30s)

# Restart the server
npm run build && node dist/index.js
```

**Prevention:**
- Monitor API health proactively
- Set up alerts for circuit breaker state changes
- Implement fallback data sources if possible

### 2. Rate Limit Errors

**Symptoms:**
- Slow responses (requests taking 30-60 seconds)
- Error message: "Rate limit exceeded"
- Many concurrent requests

**Cause:**
You're making more requests than your API plan allows, or the client-side rate limiter is queuing requests.

**Solutions:**

**A. Check your API plan limits**
```bash
# Free tier: Usually 60 requests/minute
# Pro tier: Usually 120 requests/minute
# Enterprise: Custom limits

# Check your plan at: https://unusualwhales.com/developers
```

**B. Adjust client-side rate limiter**
```bash
# Reduce rate limit to be more conservative
export UW_RATE_LIMIT_MAX=60  # Default is 120
export UW_RATE_LIMIT_WINDOW_MS=60000  # Default is 60000 (1 minute)

# Restart the server
npm run build && node dist/index.js
```

**C. Monitor rate limiter queue**
```typescript
// Add logging to rate-limiter.ts (for debugging)
console.log(`Rate limiter queue depth: ${this.queue.length}`)
```

**D. Batch requests when possible**
```typescript
// Instead of multiple separate requests:
// ❌ await uwFetch("/api/stock/AAPL/info")
// ❌ await uwFetch("/api/stock/MSFT/info")
// ❌ await uwFetch("/api/stock/GOOGL/info")

// Use batch endpoints if available (check API docs)
// ✅ await uwFetch("/api/stocks/info", { tickers: "AAPL,MSFT,GOOGL" })
```

**Prevention:**
- Design workflows to minimize API calls
- Cache frequently accessed data
- Use MCP resources for documentation (no API calls)

### 3. API Key Issues

**Symptoms:**
- Error message: "API key is required"
- Error message: "Unauthorized (401)"
- All requests fail immediately

**Cause:**
Missing or invalid API key configuration.

**Solutions:**

**A. Verify API key is set**
```bash
# Check environment variable
echo $UW_API_KEY

# If empty, set it:
export UW_API_KEY="your_api_key_here"

# For permanent configuration:
# Add to ~/.zshrc or ~/.bashrc:
echo 'export UW_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

**B. Verify API key is valid**
```bash
# Test with curl
curl -H "Authorization: Bearer $UW_API_KEY" \
  https://api.unusualwhales.com/api/stock/AAPL/info

# Should return stock data, not 401 Unauthorized
```

**C. Get a new API key**
1. Go to https://unusualwhales.com/developers
2. Sign in to your account
3. Navigate to API Keys section
4. Generate new key
5. Update environment variable

**D. Check API key permissions**
```bash
# Some endpoints require specific permissions/tiers
# Verify your plan includes the endpoints you're trying to access
```

**Prevention:**
- Store API key securely (never commit to git)
- Use environment variables or secure secret management
- Rotate keys periodically
- Monitor for unauthorized usage

### 4. Timeout Errors

**Symptoms:**
- Error message: "Request timeout"
- Requests hang for 30+ seconds
- Intermittent failures

**Cause:**
Slow API responses, network issues, or API downtime.

**Solutions:**

**A. Check network connectivity**
```bash
# Ping Unusual Whales API
ping api.unusualwhales.com

# Test with curl (should respond in <5 seconds)
time curl -H "Authorization: Bearer $UW_API_KEY" \
  https://api.unusualwhales.com/api/stock/AAPL/info
```

**B. Check API status**
```bash
# Visit status page (if available)
# Or check for announcements on Unusual Whales website
```

**C. Increase timeout (if needed)**
```typescript
// In client.ts, modify fetch call:
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000),  // Increase from default
  // ...
})
```

**D. Implement request timeout monitoring**
```typescript
// Add timing to requests
const start = Date.now()
const result = await uwFetch(endpoint, params)
const duration = Date.now() - start
if (duration > 10000) {
  console.warn(`Slow request: ${endpoint} took ${duration}ms`)
}
```

**Prevention:**
- Monitor API latency metrics
- Set up alerts for slow responses
- Implement caching for frequently accessed data

### 5. Validation Errors

**Symptoms:**
- Error message: "Invalid input: [field] is required"
- Error message: "date must be in YYYY-MM-DD format"
- Request rejected before API call

**Cause:**
Input parameters don't match the expected schema.

**Solutions:**

**A. Check parameter format**
```typescript
// Common format requirements:
// - Ticker: 1-10 characters (e.g., "AAPL", "BRK.B")
// - Date: YYYY-MM-DD (e.g., "2024-01-15")
// - Expiry: YYYY-MM-DD (e.g., "2024-01-19")
// - Limit: 1-500 (integer)

// ❌ Wrong
{ action: "info", ticker: "" }  // Empty ticker
{ action: "ohlc", date: "01/15/2024" }  // Wrong date format

// ✅ Correct
{ action: "info", ticker: "AAPL" }
{ action: "ohlc", ticker: "AAPL", candle_size: "1d", date: "2024-01-15" }
```

**B. Read the error message carefully**
```typescript
// Error messages tell you exactly what's wrong:
"ticker is required for info action"
// → Add ticker parameter

"date must be in YYYY-MM-DD format"
// → Fix date format (e.g., "2024-01-15")

"limit must be between 1 and 500"
// → Use valid limit value
```

**C. Check tool documentation**
```bash
# Use MCP Inspector to see tool schemas
npx @modelcontextprotocol/inspector node dist/index.js

# Or read the tool files directly:
cat src/tools/stock.ts | grep -A 20 "const.*Schema"
```

**D. Common validation issues:**
```typescript
// 1. Missing required action parameter
{ ticker: "AAPL" }  // ❌ Missing action
{ action: "info", ticker: "AAPL" }  // ✅

// 2. Wrong action name
{ action: "stock_info" }  // ❌ Wrong action
{ action: "info" }  // ✅

// 3. Wrong parameter type
{ action: "info", ticker: 123 }  // ❌ Number, should be string
{ action: "info", ticker: "AAPL" }  // ✅

// 4. Parameters for wrong action
{ action: "info", expiry: "2024-01-19" }  // ❌ info doesn't use expiry
{ action: "greeks", ticker: "AAPL", expiry: "2024-01-19" }  // ✅
```

## Debugging Tools

### MCP Inspector

The MCP Inspector is the best tool for debugging MCP servers. It provides a visual interface to test tools, inspect schemas, and debug requests.

**Setup:**

```bash
# 1. Build the server
npm run build

# 2. Start MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js

# 3. Open browser to http://localhost:5173
```

**Usage:**

1. **List Tools**: See all 16 available tools with descriptions
2. **Inspect Schema**: Click on a tool to see its input schema
3. **Test Tool**: Fill in parameters and execute the tool
4. **View Response**: See the formatted response data
5. **Debug Errors**: See validation errors with exact field names

**Common Debugging Workflows:**

**A. Test a specific action**
```
1. Select tool (e.g., "uw_stock")
2. Set action: "info"
3. Set ticker: "AAPL"
4. Click "Execute"
5. Verify response
```

**B. Test parameter validation**
```
1. Select tool
2. Try invalid parameters:
   - Empty strings
   - Wrong formats
   - Out of range values
3. Read validation error messages
4. Fix and retry
```

**C. Test error handling**
```
1. Set invalid API key: export UW_API_KEY="invalid"
2. Restart server
3. Execute tool
4. Should see "Unauthorized" error
```

### Manual Testing with curl

Test the Unusual Whales API directly to isolate issues:

```bash
# 1. Test authentication
curl -H "Authorization: Bearer $UW_API_KEY" \
  https://api.unusualwhales.com/api/stock/AAPL/info

# 2. Test with parameters
curl -H "Authorization: Bearer $UW_API_KEY" \
  "https://api.unusualwhales.com/api/stock/AAPL/ohlc?candle_size=1d&limit=10"

# 3. Test error handling
curl -H "Authorization: Bearer invalid_key" \
  https://api.unusualwhales.com/api/stock/AAPL/info
# Should return 401 Unauthorized
```

### Log Analysis

**Enable detailed logging:**

```typescript
// In client.ts, add logging:
export async function uwFetch(endpoint: string, params?: Record<string, unknown>) {
  console.log(`[REQUEST] ${endpoint}`, params)

  const result = await fetch(/* ... */)

  console.log(`[RESPONSE] ${endpoint}`, {
    status: result.status,
    statusText: result.statusText
  })

  return result
}
```

**Common log patterns:**

```bash
# Successful request
[REQUEST] /api/stock/AAPL/info {}
[RESPONSE] /api/stock/AAPL/info { status: 200, statusText: 'OK' }

# Rate limit hit
[REQUEST] /api/stock/AAPL/info {}
[RESPONSE] /api/stock/AAPL/info { status: 429, statusText: 'Too Many Requests' }

# API error
[REQUEST] /api/stock/INVALID/info {}
[RESPONSE] /api/stock/INVALID/info { status: 404, statusText: 'Not Found' }
```

### Testing in Claude Code

**Setup:**

1. Add MCP server to Claude Code configuration
2. Test with natural language prompts
3. Verify tool execution in conversation

**Example prompts:**

```
# Basic test
"Get info for AAPL stock"

# Parameter test
"Show me AAPL option chain for Jan 19, 2024"

# Error handling test
"Get info for INVALIDTICKER"
# Should handle gracefully with error message

# Rate limit test
"Get info for AAPL, MSFT, GOOGL, TSLA, NVDA, AMD, INTC, QCOM, AVGO, TXN"
# Should queue requests and complete all
```

## Testing Best Practices

### Avoid Rate Limits During Development

**1. Use test fixtures instead of real API**
```typescript
// Create mock responses for common requests
const mockResponses = {
  "/api/stock/AAPL/info": { ticker: "AAPL", price: 175.50 }
}

// In tests, mock uwFetch:
vi.mock("../src/client.js", () => ({
  uwFetch: vi.fn((endpoint) => mockResponses[endpoint])
}))
```

**2. Cache responses locally**
```bash
# Save API response to file
curl -H "Authorization: Bearer $UW_API_KEY" \
  https://api.unusualwhales.com/api/stock/AAPL/info > test-data/aapl-info.json

# Use file in tests
```

**3. Use MCP resources for documentation**
```typescript
// MCP resources don't hit the API
// Use them for: API docs, examples, guides
```

**4. Implement request deduplication**
```typescript
// Cache identical requests within a short window
const requestCache = new Map()

async function cachedFetch(endpoint: string) {
  if (requestCache.has(endpoint)) {
    return requestCache.get(endpoint)
  }

  const result = await uwFetch(endpoint)
  requestCache.set(endpoint, result)

  // Clear after 60 seconds
  setTimeout(() => requestCache.delete(endpoint), 60000)

  return result
}
```

### Writing Good Tests

**1. Test validation, not API**
```typescript
// ✅ Good: Tests validation logic
it("rejects empty ticker", () => {
  const result = stockInputSchema.safeParse({ action: "info", ticker: "" })
  expect(result.success).toBe(false)
})

// ❌ Bad: Tests API (slow, uses quota)
it("fetches AAPL info", async () => {
  const result = await uwFetch("/api/stock/AAPL/info")  // Real API call!
  expect(result.data.ticker).toBe("AAPL")
})
```

**2. Mock at the right level**
```typescript
// ✅ Mock uwFetch (tests tool logic)
vi.mock("../src/client.js", () => ({
  uwFetch: vi.fn()
}))

// ❌ Mock fetch (doesn't test client.ts logic)
vi.mock("node:fetch")
```

**3. Test error cases**
```typescript
// Test all error scenarios:
// - Validation errors
// - API errors (4xx, 5xx)
// - Network errors
// - Circuit breaker open
// - Rate limit exceeded
```

## API Sync Issues

The API sync checker validates that our schemas match the Unusual Whales OpenAPI spec.

### Running the Sync Checker

```bash
# Check all tools
npm run check-api

# Should output:
# ✅ All tools are in sync with Unusual Whales API
```

### Common Sync Issues

**1. Missing parameter in schema**

**Error:**
```
❌ uw_stock: Missing parameter 'new_param' in info action
```

**Solution:**
```typescript
// Add the parameter to the schema
const infoSchema = z.object({
  action: z.literal("info"),
  ticker: tickerSchema,
  new_param: z.string().optional(),  // ← Add this
})
```

**2. Wrong parameter type**

**Error:**
```
❌ uw_stock: Parameter 'limit' should be integer, got number
```

**Solution:**
```typescript
// Change from z.number() to z.number().int()
limit: z.number().int().min(1).max(500)
```

**3. Wrong parameter constraints**

**Error:**
```
❌ uw_stock: Parameter 'limit' max should be 500, got 1000
```

**Solution:**
```typescript
// Update constraint to match API
limit: z.number().int().min(1).max(500)  // Change max from 1000 to 500
```

**4. Extra parameter in schema**

**Error:**
```
❌ uw_stock: Extra parameter 'old_param' not in API spec
```

**Solution:**
```typescript
// Remove the parameter from schema (API no longer supports it)
const infoSchema = z.object({
  action: z.literal("info"),
  ticker: tickerSchema,
  // old_param: z.string().optional(),  // ← Remove this
})
```

### Debugging Sync Checker

**1. Check OpenAPI spec directly**
```bash
# Fetch the spec
curl https://api.unusualwhales.com/openapi.json > openapi.json

# Search for specific endpoint
cat openapi.json | jq '.paths."/api/stock/{ticker}/info"'
```

**2. Run sync checker with verbose output**
```bash
# Add logging to check-api-sync.js
node scripts/check-api-sync.js --verbose
```

**3. Test specific tool**
```bash
# Modify check-api-sync.js to check only one tool
node scripts/check-api-sync.js --tool uw_stock
```

## Performance Issues

### Slow Responses

**Symptoms:**
- Requests taking >5 seconds
- Timeouts
- Poor user experience

**Diagnostics:**

**1. Measure API latency**
```typescript
const start = Date.now()
const result = await uwFetch(endpoint, params)
const duration = Date.now() - start
console.log(`Request took ${duration}ms`)

// Good: <1000ms
// Acceptable: 1000-3000ms
// Slow: >3000ms
```

**2. Check rate limiter queue**
```typescript
// In rate-limiter.ts
console.log(`Queue depth: ${this.queue.length}`)
console.log(`Requests in window: ${this.requests.length}`)
```

**3. Check circuit breaker state**
```typescript
// In circuit-breaker.ts
console.log(`Circuit breaker state: ${this.state}`)
console.log(`Failure count: ${this.failureCount}`)
```

**Solutions:**

**1. Reduce concurrent requests**
```typescript
// Limit concurrent requests
const limit = pLimit(5)  // Max 5 concurrent

const promises = tickers.map(ticker =>
  limit(() => uwFetch(`/api/stock/${ticker}/info`))
)
await Promise.all(promises)
```

**2. Implement caching**
```typescript
// Simple in-memory cache
const cache = new Map()

async function cachedFetch(endpoint: string, ttl = 60000) {
  const cached = cache.get(endpoint)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }

  const data = await uwFetch(endpoint)
  cache.set(endpoint, { data, timestamp: Date.now() })
  return data
}
```

**3. Optimize request patterns**
```typescript
// ❌ Sequential requests (slow)
for (const ticker of tickers) {
  await uwFetch(`/api/stock/${ticker}/info`)  // Waits for each
}

// ✅ Parallel requests (fast, respects rate limit)
await Promise.all(
  tickers.map(ticker => uwFetch(`/api/stock/${ticker}/info`))
)
```

### High Memory Usage

**Symptoms:**
- Memory growing over time
- Out of memory errors
- Process crashes

**Diagnostics:**

```bash
# Monitor memory usage
node --expose-gc --max-old-space-size=512 dist/index.js

# In Node.js console:
> process.memoryUsage()
{
  rss: 50000000,      // Resident set size
  heapTotal: 30000000, // Total heap
  heapUsed: 20000000,  // Used heap
  external: 1000000
}
```

**Solutions:**

**1. Clear caches periodically**
```typescript
// Clear cache every hour
setInterval(() => {
  cache.clear()
  console.log("Cache cleared")
}, 3600000)
```

**2. Limit cache size**
```typescript
const MAX_CACHE_SIZE = 1000

function cacheSet(key: string, value: unknown) {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(key, value)
}
```

**3. Stream large responses**
```typescript
// For large datasets, stream instead of buffering
const response = await fetch(url)
const reader = response.body.getReader()
// Process chunks as they arrive
```

## Getting More Help

### Documentation

- **Architecture**: See `docs/ARCHITECTURE.md` for system design
- **Contributing**: See `CONTRIBUTING.md` for development guide
- **Examples**: See `docs/EXAMPLES.md` for usage examples
- **API Docs**: https://docs.unusualwhales.com

### Support Channels

- **GitHub Issues**: https://github.com/anthropics/unusual-whales-mcp/issues
  - Bug reports
  - Feature requests
  - Questions

- **Unusual Whales Support**: https://unusualwhales.com/support
  - API-specific questions
  - Account issues
  - API tier questions

### Before Asking for Help

Include this information in your issue:

1. **Version**: Run `npm list @unusualwhales/mcp-server`
2. **Environment**: Node.js version, OS, Claude Code version
3. **Error Message**: Full error message with stack trace
4. **Steps to Reproduce**: Minimal example that reproduces the issue
5. **Expected Behavior**: What you expected to happen
6. **Actual Behavior**: What actually happened
7. **Logs**: Relevant log output (redact API keys!)

**Example Issue:**

```markdown
## Bug: Circuit breaker opens after 3 failures instead of 5

**Version**: 1.0.0
**Environment**: Node.js 20.10.0, macOS 14.2, Claude Code 0.7.0

**Error Message**:
```
Service temporarily unavailable (circuit breaker open)
```

**Steps to Reproduce**:
1. Set invalid API key
2. Make 3 requests to uw_stock info action
3. Circuit breaker opens (should open after 5)

**Expected**: Circuit breaker opens after 5 failures
**Actual**: Circuit breaker opens after 3 failures

**Logs**:
```
[REQUEST] /api/stock/AAPL/info {}
[RESPONSE] /api/stock/AAPL/info { status: 401 }
[CIRCUIT BREAKER] Failure count: 1
... (3 more requests)
[CIRCUIT BREAKER] Opening circuit after 3 failures
```

**Configuration**:
```bash
UW_CIRCUIT_BREAKER_THRESHOLD=5  # Default value
```
```
