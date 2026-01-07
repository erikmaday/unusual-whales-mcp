import { stockTool, handleStock } from "./stock.js"
import { optionsTool, handleOptions } from "./options.js"
import { marketTool, handleMarket } from "./market.js"
import { flowTool, handleFlow } from "./flow.js"
import { darkpoolTool, handleDarkpool } from "./darkpool.js"
import { congressTool, handleCongress } from "./congress.js"
import { insiderTool, handleInsider } from "./insider.js"
import { institutionsTool, handleInstitutions } from "./institutions.js"
import { earningsTool, handleEarnings } from "./earnings.js"
import { etfTool, handleEtf } from "./etf.js"
import { screenerTool, handleScreener } from "./screener.js"
import { shortsTool, handleShorts } from "./shorts.js"
import { seasonalityTool, handleSeasonality } from "./seasonality.js"
import { newsTool, handleNews } from "./news.js"
import { alertsTool, handleAlerts } from "./alerts.js"
import { politiciansTool, handlePoliticians } from "./politicians.js"

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required: string[]
  }
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

interface ToolRegistration {
  tool: ToolDefinition
  handler: ToolHandler
}

const toolRegistrations: ToolRegistration[] = [
  { tool: stockTool, handler: handleStock },
  { tool: optionsTool, handler: handleOptions },
  { tool: marketTool, handler: handleMarket },
  { tool: flowTool, handler: handleFlow },
  { tool: darkpoolTool, handler: handleDarkpool },
  { tool: congressTool, handler: handleCongress },
  { tool: insiderTool, handler: handleInsider },
  { tool: institutionsTool, handler: handleInstitutions },
  { tool: earningsTool, handler: handleEarnings },
  { tool: etfTool, handler: handleEtf },
  { tool: screenerTool, handler: handleScreener },
  { tool: shortsTool, handler: handleShorts },
  { tool: seasonalityTool, handler: handleSeasonality },
  { tool: newsTool, handler: handleNews },
  { tool: alertsTool, handler: handleAlerts },
  { tool: politiciansTool, handler: handlePoliticians },
]

export const tools = toolRegistrations.map((reg) => reg.tool)

export const handlers: Record<string, ToolHandler> = Object.fromEntries(
  toolRegistrations.map((reg) => [reg.tool.name, reg.handler]),
)
