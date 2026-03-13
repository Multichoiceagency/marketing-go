import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
})

export default redis
