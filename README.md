# Unusual Whales MCP Server

An MCP server that provides access to [Unusual Whales](https://unusualwhales.com) market data - options flow, dark pool activity, congressional trades, and more. Works with any MCP-compatible client (Claude, or any LLM/application that supports MCP).

## What You Can Do

Ask about the market using natural language:

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

The server includes many ready-to-use prompts. Just ask to use any prompt by name.

#### Market Overview
| Prompt | Description | Example |
|--------|-------------|---------|
| `daily-summary` | Comprehensive market overview with tide, sectors, flow, dark pool | "Use the daily-summary prompt" |
| `morning-briefing` | Start the day with tide, earnings, and key activity | "Use the morning-briefing prompt" |
| `end-of-day-recap` | EOD summary with top movers, sectors, and themes | "Use end-of-day-recap" |
| `weekly-expiration` | Max pain, gamma, and OI for weekly expiration | "Use weekly-expiration for SPY, QQQ, IWM" |
| `top-movers` | Top tickers by net premium and options impact | "Use top-movers" |

#### Ticker Analysis
| Prompt | Description | Example |
|--------|-------------|---------|
| `ticker-analysis` | Deep dive on a stock with options, dark pool, insiders, catalysts | "Use ticker-analysis for NVDA" |
| `options-setup` | IV rank, term structure, max pain - is premium cheap or expensive? | "Use options-setup for TSLA" |
| `pre-earnings` | Historical moves, IV, positioning before earnings | "Use pre-earnings for AAPL" |
| `greek-exposure` | Gamma, delta, vanna exposure by strike | "Use greek-exposure for SPY" |
| `short-interest` | Short interest, FTDs, squeeze potential | "Use short-interest for GME" |
| `option-contract` | Deep dive on a specific option contract | "Use option-contract for AAPL240119C00150000" |
| `correlation-analysis` | Analyze correlations between tickers | "Use correlation-analysis for NVDA,AMD,INTC" |

#### Flow & Activity
| Prompt | Description | Example |
|--------|-------------|---------|
| `unusual-flow` | Scan for unusual options activity across the market | "Use unusual-flow with min_premium 500000" |
| `dark-pool-scanner` | Find large dark pool prints and institutional activity | "Use dark-pool-scanner" |
| `sector-flow` | Options flow sentiment for sector groups (mag7, semi, bank, etc.) | "Use sector-flow for semi" |

#### Smart Money
| Prompt | Description | Example |
|--------|-------------|---------|
| `congress-tracker` | Recent congressional trading with pattern detection | "Use congress-tracker" |
| `politician-portfolio` | Portfolio holdings and trades for a specific politician | "Use politician-portfolio for Nancy Pelosi" |
| `insider-scanner` | Scan for insider buying/selling patterns | "Use insider-scanner" |
| `institutional-activity` | 13F filings, holdings changes, sector rotation | "Use institutional-activity for technology" |
| `analyst-tracker` | Analyst ratings with options flow correlation | "Use analyst-tracker" |

#### Calendars & Events
| Prompt | Description | Example |
|--------|-------------|---------|
| `earnings-calendar` | Earnings with IV, expected moves, and positioning | "Use earnings-calendar for this week" |
| `fda-calendar` | FDA events with biotech options activity | "Use fda-calendar" |
| `economic-calendar` | FOMC, CPI, jobs data with market positioning | "Use economic-calendar" |

#### Screening & Discovery
| Prompt | Description | Example |
|--------|-------------|---------|
| `iv-screener` | Find high or low IV rank stocks for options strategies | "Use iv-screener" |
| `bullish-confluence` | Stocks with bullish flow + dark pool + insider buying | "Use bullish-confluence" |
| `bearish-confluence` | Stocks with bearish flow + distribution + insider selling | "Use bearish-confluence" |
| `news-scanner` | Market news headlines with related flow | "Use news-scanner" or "Use news-scanner for TSLA" |

#### Other
| Prompt | Description | Example |
|--------|-------------|---------|
| `seasonality` | Historical seasonal patterns for a ticker or market | "Use seasonality for AAPL" |
| `etf-flow` | ETF inflows/outflows or find ETF exposure for a stock | "Use etf-flow for QQQ" |

#### Combining Prompts

Chain prompts together for comprehensive analysis:

```
Use morning-briefing, then use unusual-flow to dig into the top movers
```

```
Use pre-earnings for NVDA, then use greek-exposure to see dealer positioning
```

```
Use bullish-confluence to find candidates, then use ticker-analysis on the top result
```

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

Once configured, just ask about the market. The Unusual Whales data will be used automatically.

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
