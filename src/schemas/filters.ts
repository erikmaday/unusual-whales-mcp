import { z } from "zod"

/** Premium filter (min/max) */
export const premiumFilterSchema = z.object({
  min_premium: z.number().nonnegative("Premium cannot be negative").default(0).describe("The minimum premium on the alert or trade").optional(),
  max_premium: z.number().nonnegative("Premium cannot be negative").describe("The maximum premium on the alert or trade").optional(),
})

/** Size filter (min/max) */
export const sizeFilterSchema = z.object({
  min_size: z.number().int().nonnegative("Size cannot be negative").default(0).describe("The minimum size on that alert. Size is defined as the sum of the sizes of all transactions that make up the alert").optional(),
  max_size: z.number().int().nonnegative("Size cannot be negative").describe("The maximum size on that alert").optional(),
})

/** Volume filter (min/max) */
export const volumeFilterSchema = z.object({
  min_volume: z.number().int().nonnegative("Volume cannot be negative").default(0).describe("The minimum volume on the contract").optional(),
  max_volume: z.number().int().nonnegative("Volume cannot be negative").describe("The maximum volume on the contract").optional(),
})

/** Open interest filter (min/max) */
export const oiFilterSchema = z.object({
  min_oi: z.number().int().nonnegative("Open interest cannot be negative").describe("The minimum open interest on the contract").optional(),
  max_oi: z.number().int().nonnegative("Open interest cannot be negative").describe("The maximum open interest on the contract").optional(),
})

/** Days to expiry filter (min/max) */
export const dteFilterSchema = z.object({
  min_dte: z.number().int().nonnegative("DTE cannot be negative").describe("The minimum days to expiry").optional(),
  max_dte: z.number().int().nonnegative("DTE cannot be negative").describe("The maximum days to expiry").optional(),
})
