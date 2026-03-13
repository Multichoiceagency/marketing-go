import { Queue } from "bullmq"

// BullMQ connection config — requires Redis
const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
}

export const postQueue = new Queue("posts", { connection })
export const analyticsQueue = new Queue("analytics", { connection })
export const brandScrapeQueue = new Queue("brand-scrape", { connection })

export type PostJobData = {
  postId: string
  workspaceId: string
  platform: string
  content: string
  scheduledAt: string
}

export type AnalyticsJobData = {
  workspaceId: string
  platform: string
  date: string
}

export type BrandScrapeJobData = {
  brandId: string
  url: string
}
