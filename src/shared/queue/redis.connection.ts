// =============================================================
// Redis Connections — จุดเดียวที่สร้าง connection (แบบเดียวกับ prisma singleton)
// =============================================================
// Redis เป็น optional ทั้งระบบ: ทุกจุดที่ใช้ต้องถาม isRedisEnabled() ก่อน
// แล้วมีทางสำรองเสมอ (email ส่ง inline, outbox ใช้ poller, socket ไม่มี adapter)
// → deploy โดยยังไม่มี Redis ได้ ไม่มีอะไรพัง แค่ยังไม่ scale
//
// ทำไมหลาย connection:
// - BullMQ ต้องการ connection ที่ตั้ง maxRetriesPerRequest: null (ห้าม fail
//   คำสั่งระหว่างรอ reconnect — worker ต้องรอจนกว่า Redis กลับมา)
// - socket.io adapter ต้องการ pub/sub แยกคู่ (subscriber mode ใช้คำสั่งอื่นไม่ได้)
// จึง export เป็น factory ให้แต่ละผู้ใช้สร้างของตัวเอง ไม่แชร์ข้ามหน้าที่
import { Redis } from "ioredis"
import { env } from "@shared/config/env"

export function isRedisEnabled(): boolean {
  return Boolean(env.REDIS_URL)
}

// connection สำหรับ BullMQ (queue + worker) — ห้ามใช้กับงานอื่น
export function createBullConnection(): Redis {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not set — check isRedisEnabled() first")
  }
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
}

// connection ทั่วไป (rate-limit store, lock, socket adapter pub/sub)
export function createRedisConnection(): Redis {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not set — check isRedisEnabled() first")
  }
  return new Redis(env.REDIS_URL)
}
