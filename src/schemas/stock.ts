import { z } from "zod"

/** Filter type for intraday flow */
export const filterSchema = z.enum(["NetPremium", "Volume", "Trades"]).describe("Filter type for intraday flow").default("NetPremium")
