# Unusual Whales MCP Server

An MCP server that gives Claude access to [Unusual Whales](https://unusualwhales.com) market data - options flow, dark pool activity, congressional trades, and more.

## What You Can Do

Ask Claude about the market using natural language:

- "What's the options flow for AAPL today?"
- "Show me the latest congressional trades"
- "What's the dark pool activity for TSLA?"
- "Get the max pain for SPY options expiring this Friday"
- "What are institutions buying in the tech sector?"
- "Give me a daily market summary"
- "Deep dive on NVDA - options, dark pool, insider activity"

### Available Data

| Category | What's Included |
|----------|-----------------|
| **Stock** | Options chains, Greeks, IV rank, OHLC candles, max pain, open interest, volatility |
| **Options** | Contract flow, historic prices, intraday data, volume profiles |
| **Flow** | Options flow alerts, full tape, net flow by expiry, sector flow (mag7, semis, etc.) |
| **Dark Pool** | Dark pool transactions with filtering |
| **Congress** | Congressional trades, late reports, individual member activity |
| **Politicians** | Portfolios, recent trades, holdings by ticker |
| **Insider** | Insider transactions, sector flow, ticker flow |
| **Institutions** | 13F filings, holdings, sector exposure, ownership |
| **Market** | Market tide, sector tide, economic calendar, FDA calendar, correlations |
| **Earnings** | Premarket and afterhours schedules, historical earnings |
| **ETF** | Holdings, exposure, inflows/outflows, sector weights |
| **Shorts** | Short interest, FTDs, short volume ratio |
| **Seasonality** | Market seasonality, monthly performers, ticker patterns |
| **Screener** | Stock screener, options screener, analyst ratings |
| **News** | Market news headlines |

### Built-in Analysis Prompts

The server includes ready-to-use prompts for common workflows:

- **daily-summary** - Comprehensive market overview combining tide, sectors, flow, and dark pool
- **ticker-analysis** - Deep dive on a single stock with options, dark pool, insiders, and catalysts
- **congress-tracker** - Recent congressional trading with pattern detection

Just ask Claude to "use the daily-summary prompt" or "analyze NVDA with the ticker-analysis prompt".

## Getting Started

### 1. Get an API Key

Sign up at [Unusual Whales](https://unusualwhales.com) and get your API key.

### 2. Install

**Claude Code:**
```bash
claude mcp add unusualwhales -e UW_API_KEY=your_api_key -- npx -y @erikmaday/unusual-whales-mcp
```

**Claude Desktop:**

Add to your config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

### 3. Start Asking Questions

Once configured, just ask Claude about the market. It'll use the Unusual Whales data automatically.

## Configuration (Optional)

The defaults work well for most users. All settings can be adjusted via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `UW_API_KEY` | Your Unusual Whales API key | Required |
| `UW_RATE_LIMIT_PER_MINUTE` | Max requests per minute | `120` |
| `UW_MAX_RETRIES` | Retry attempts for failed requests | `3` |
| `UW_CIRCUIT_BREAKER_THRESHOLD` | Failures before pausing requests | `5` |
| `UW_CIRCUIT_BREAKER_RESET_TIMEOUT` | Milliseconds before retrying after failures | `30000` |

The server automatically handles rate limiting, retries failed requests with backoff, and temporarily pauses requests if the API is having issues (circuit breaker). See [CONTRIBUTING.md](CONTRIBUTING.md) for technical details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and contribution guidelines.

## License

MIT
