# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-01-05

### Added

- **Politician Disclosures**: New `disclosures` action in `uw_politicians` tool to retrieve annual disclosure file records with optional filtering by `politician_id`, `latest_only`, and `year` parameters

### Changed

- Updated README installation instructions to use `npx` for easier setup

### Technical

- Added GitHub Actions workflow for npm publishing with OIDC authentication
- Improved CI/CD pipeline configuration

## [0.1.1] - 2026-01-03

### Changed

- Updated README installation instructions to use `npx`

### Technical

- Added GitHub Actions workflow for npm publishing with OIDC authentication

## [0.1.0] - 2025-01-02

### Added

- Initial release of the Unusual Whales MCP server
- **Stock Tools**: Stock screener, ticker information, historical data, analyst ratings
- **Options Tools**: Options contracts, chain data, volume analysis, Greeks, expiration dates
- **Flow Tools**: Options flow alerts, flow by ticker, historical flow data
- **Market Tools**: Market overview, sector performance, economic calendar, market news
- **Dark Pool Tools**: Dark pool transactions, summary data, ticker-specific dark pool activity
- **Congress Tools**: Congressional trading activity, politician portfolios, recent filings
- **Insider Tools**: Insider trading data, SEC Form 4 filings, insider activity summaries
- **Institutions Tools**: 13F filings, institutional holdings, position changes
- **Earnings Tools**: Earnings calendar, estimates, historical earnings data
- **ETF Tools**: ETF holdings, flow data, sector breakdowns
- **Screener Tools**: Stock and options screeners with customizable filters
- **Shorts Tools**: Short interest data, most shorted stocks, borrow rates
- **Seasonality Tools**: Historical seasonality patterns and analysis
- **News Tools**: Market news, ticker-specific news, SEC filings
- **Alerts Tools**: Price alerts, volume alerts, options flow alerts
- **Politicians Tools**: Politician profiles, trading history, committee assignments

### Technical

- TypeScript strict mode with full type declarations
- ESM module format
- Node.js 20+ requirement
- MCP SDK 1.0.0 compatibility
- Path traversal protection and input validation
- Automated API sync checking workflow
