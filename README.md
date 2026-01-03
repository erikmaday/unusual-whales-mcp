# Unusual Whales MCP Server

An MCP server that provides access to the [Unusual Whales](https://unusualwhales.com) API for AI assistants like Claude.

## Features

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

## License

MIT
