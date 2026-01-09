# Unusual Whales MCP Server

An MCP server that provides access to the [Unusual Whales](https://unusualwhales.com) API for AI assistants like Claude.

## Features

### Tools

| Tool | Description |
|------|-------------|
| **Stock** | Options chains, Greeks, IV rank, OHLC candles, max pain, open interest, flow alerts, spot exposures, volatility analysis |
| **Options** | Option contract flow, historic prices, intraday data, volume profiles |
| **Flow** | Options flow alerts, full tape, net flow by expiry, group greek flow (mag7, semis, etc.) |
| **Dark Pool** | Dark pool transactions with premium/size filters |
| **Congress** | Congressional trades, late reports, individual congress member activity |
| **Politicians** | Politician portfolios, recent trades, holdings by ticker |
| **Insider** | Insider transactions, sector flow, ticker flow, insider lists |
| **Institutions** | 13F filings, institutional holdings, activity, sector exposure, ownership |
| **Market** | Market tide, sector tide, ETF tide, economic calendar, FDA calendar, correlations, SPIKE |
| **Earnings** | Premarket and afterhours earnings schedules, historical earnings by ticker |
| **ETF** | ETF info, holdings, exposure, inflows/outflows, sector weights |
| **Shorts** | Short interest, FTDs, short volume ratio, volumes by exchange |
| **Seasonality** | Market seasonality, monthly performers, ticker seasonality patterns |
| **Screener** | Stock screener, options contract screener, analyst ratings screener |
| **News** | Market news headlines with ticker filter |
| **Alerts** | User alert configurations and triggered alerts |

### Resources

The server exposes documentation resources that AI assistants can access:

| Resource | URI | Description |
|----------|-----|-------------|
| **API Reference** | `docs://api-reference` | Complete reference documentation for all available tools with input schemas and annotations |
| **Tools Summary** | `docs://tools-summary` | JSON summary of available tools with their actions and required parameters |

AI assistants can request these resources when they need information about available functionality or tool usage.

## Prerequisites

Get your API key from [Unusual Whales](https://unusualwhales.com).

## Installation

### Claude Code

```bash
claude mcp add unusualwhales -e UW_API_KEY=your_api_key -- npx -y @erikmaday/unusual-whales-mcp
```

### Claude Desktop

Add to your config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "unusualwhales": {
      "command": "npx",
      "args": ["-y", "@erikmaday/unusual-whales-mcp"],
      "env": {
        "UW_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `UW_API_KEY` | Your Unusual Whales API key (required) | - |
| `UW_RATE_LIMIT_PER_MINUTE` | Max requests per minute | `120` |
| `UW_MAX_RETRIES` | Max retry attempts for failed requests (5xx errors, network failures) | `3` |
| `UW_CIRCUIT_BREAKER_THRESHOLD` | Number of failures before circuit opens | `5` |
| `UW_CIRCUIT_BREAKER_RESET_TIMEOUT` | Milliseconds before attempting recovery | `30000` |
| `UW_CIRCUIT_BREAKER_SUCCESS_THRESHOLD` | Successful requests needed to close circuit | `2` |

The server includes a sliding window rate limiter to prevent exceeding API limits. The Unusual Whales API allows 120 requests/minute and 15,000 requests/day by default (some plans may differ). If you have a custom rate limit or want to adjust the MCP server's limit, set `UW_RATE_LIMIT_PER_MINUTE` accordingly.

Failed requests (5xx errors, network timeouts) are automatically retried with exponential backoff (1s, 2s, 4s delays). Client errors (4xx) are not retried. Set `UW_MAX_RETRIES=0` to disable retries.

### Circuit Breaker

The server implements a circuit breaker pattern to protect against cascading failures when the API is unavailable:

- **CLOSED**: Normal operation - all requests go through
- **OPEN**: Fast-fail mode - requests immediately return errors without hitting the API
- **HALF_OPEN**: Recovery testing - limited requests allowed to test if the service has recovered

When the failure threshold is reached (default 5 consecutive failures), the circuit opens for 30 seconds. After this timeout, the circuit enters HALF_OPEN state and allows test requests through. If 2 consecutive requests succeed, the circuit closes and normal operation resumes. Any failure in HALF_OPEN immediately reopens the circuit.

## Usage

Once configured, ask Claude about market data:

- "What's the options flow for AAPL today?"
- "Show me the latest congressional trades"
- "What's the dark pool activity for TSLA?"
- "Get the max pain for SPY options expiring this Friday"
- "What are institutions buying in the tech sector?"

## Development

```bash
npm run dev       # Watch mode
npm run build     # Build
npm run start     # Run server
npm run check-api # Check for API changes
```

### API Sync Checker

The `check-api-sync.js` script compares the UnusualWhales OpenAPI spec against the implemented endpoints, checking:

- **Endpoint coverage**: Missing or extra endpoints
- **Parameter validation**: Required/optional parameters, enum values, constraints
- **Response schemas**: Documented response types (optional validation)

Run with optional flags:

```bash
npm run check-api                        # Standard check
SHOW_RESPONSE_SCHEMAS=true npm run check-api  # Include response schema details
CREATE_ISSUES=true npm run check-api     # Create GitHub issues for problems
```

Response schema validation is lower priority since the MCP passes API responses through without transformation. Enable `SHOW_RESPONSE_SCHEMAS=true` to see which endpoints have documented response schemas for potential future TypeScript type generation.

### Debugging with MCP Inspector

To test and debug the server locally, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npm run build
UW_API_KEY=your_api_key npx @modelcontextprotocol/inspector node ./dist/index.js
```

This opens a web UI where you can browse available tools, test them interactively, and inspect request/response payloads.

### Testing with Claude Code

To test your local build with Claude Code directly:

```bash
npm run build
claude mcp add unusualwhales-dev -e UW_API_KEY=your_api_key -- node /absolute/path/to/unusual-whales-mcp/dist/index.js
```

Use a different name (like `unusualwhales-dev`) to avoid conflicts with the published package. After making changes, rebuild and restart Claude Code to pick them up.

```bash
claude mcp list                      # Check server status
claude mcp remove unusualwhales-dev  # Remove when done
```

## License

MIT
