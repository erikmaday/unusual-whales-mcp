import { z } from "zod"

/** Seasonality performers order by column */
export const seasonalityOrderBySchema = z.enum([
  "month", "positive_closes", "years", "positive_months_perc",
  "median_change", "avg_change", "max_change", "min_change",
]).describe("Column to order seasonality results by")
