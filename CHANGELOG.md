# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-12

### Added

- **Dependabot**: Automated dependency updates for npm packages and GitHub Actions
- **Security Scanning**: `npm audit` step in CI pipeline to catch vulnerabilities
- **Path Params Tests**: 31 new tests for `path-params.ts` bringing it to 100% coverage

### Changed

- **Coverage Threshold**: Raised from 80% to 90% (now enforced, not just a warning)
- **Documentation**: Expanded API sync checker docs in CONTRIBUTING.md
- **Code Comments**: Cleaned up comments in `check-api-sync.js` for readability

### Technical

- Total test count increased from 532 to 563
- Overall coverage now at 99.1% statements, 95.5% branches

## [0.1.4] - 2026-01-11

### Added

- **Test Suite**: Comprehensive unit and integration tests with 459+ tests covering all tools, circuit breaker, rate limiter, client, schemas, prompts, and resources
- **Circuit Breaker**: Resilient API failure handling with circuit breaker pattern
- **Exponential Backoff**: Retry logic with exponential backoff for transient API failures
- **Idempotent Hints**: Added idempotent hints to all 16 tool files for improved reliability
- **Lit Flow Endpoints**: New `lit_flow_recent` and `lit_flow_ticker` actions in flow tool for lit exchange trade data
- **API Sync Checker Enhancements**:
  - Enum value validation to detect missing/extra enum values
  - Deprecated endpoint detection
  - Default value consistency checking
  - Required vs optional parameter mismatch detection
  - Numeric constraint validation (min/max/exclusiveMin/exclusiveMax)

### Fixed

- **Missing Enum Values**: Added 171+ missing enum values:
  - 103 in screener tool
  - 59 in institutions tool
  - 9 in stock tool
- **Numeric Constraint Mismatches**: Fixed 81+ numeric constraints across tools:
  - 39 in flow tool
  - 13 in stock tool
  - 8 in darkpool tool
  - 6 in institutions tool
  - 4 in market tool
  - 3 in insider tool
  - 2 each in earnings and seasonality tools
  - 1 each in politicians, screener, news, options, and alerts tools
- **Default Value Mismatches**: Fixed 74+ default value issues:
  - 16 in flow tool
  - 13 in stock tool
  - 11 in institutions tool
  - 8 each in market and darkpool tools
  - 4 each in seasonality and congress tools
  - 3 in screener tool
  - 2 each in earnings, news, options, politicians, alerts, and insider tools
- **Format Validations**: Added 2 missing format validations (alerts, politicians)
- **Extra Enum Values**: Removed 12 extra enum values (10 from institutions, 2 from options)
- **Required/Optional Mismatches**: Fixed 7 required/optional parameter mismatches (6 in stock, 1 in market)
- **Flow Tool**: Renamed `ticker` to `ticker_symbol` to match API spec
- **Market Tool**: Clarified tickers parameter handling
- **Screener Tool**: Added missing optional parameters

### Changed

- Updated OpenAPI spec to latest version
- Updated README documentation

## [0.1.3] - 2026-01-08

### Added

- **Rate Limiting**: Sliding window rate limiter for API requests (60 requests/minute) to prevent hitting API limits
- **Schema Validation**: Zod schema validation for all MCP tools ensuring type-safe parameter handling
- **Missing Parameters**: Added numerous missing optional parameters across tools:
  - 43 parameters to flow tool
  - 9 parameters to insider tool
  - 7 parameters to seasonality performers
  - Parameters to options, news headlines, stock atm-chains, spot-exposures, and historical risk reversal skew endpoints

### Changed

- Aligned all schema descriptions with OpenAPI spec for consistency
- Improved schema descriptions with detailed API spec information
- Renamed `ticker` to `ticker_symbols` in alerts tool to match API spec

### Fixed

- Removed 15 extra parameters from stock tool that weren't in the API spec
- Removed unsupported parameters from flow tool
- Added missing `ticker_symbol` parameter for insider transactions

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
