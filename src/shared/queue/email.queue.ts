// =============================================================
// Email Queue (BullMQ) — งานส่งอีเมลทุกชนิดของระบบ
// =============================================================
// ทำไมอีเมลต้องเข้าคิว ไม่ส่งตรงๆ ใน request:
// - SMTP ล่มชั่วคราว/ช้า = ของจริงที่เกิดบ่อย — เดิมส่งพลาดคือ "หายเลย"
//   (register มี try/catch แล้ว log ทิ้ง) → คิวให้ retry อัตโนมัติแบบ backoff
// - request ไม่ต้องรอ SMTP ตอบ (ตัด latency ~วินาทีออกจาก signup)
//
// อีเมลทุกชนิดมี shape เดียวกัน (ผู้รับ + ลิงก์) → คิวเดียว แยกด้วย kind
import { Queue } from "bullmq"
import { logger } from "@shared/logging/logger"
import { createBullConnection, isRedisEnabled } from "./redis.connection"

export type EmailJobKind = "verification" | "password-reset" | "invitation"

export interface EmailJob {
  kind: EmailJobKind
  to: string
  url: string
}

export const EMAIL_QUEUE_NAME = "email"

let queue: Queue<EmailJob> | null = null

// lazy singleton — สร้างเมื่อถูกใช้ครั้งแรกและมี Redis เท่านั้น
export function getEmailQueue(): Queue<EmailJob> | null {
  if (!isRedisEnabled()) return null
  if (!queue) {
    queue = new Queue<EmailJob>(EMAIL_QUEUE_NAME, {
      connection: createBullConnection(),
      defaultJobOptions: {
        // SMTP ล่มชั่วคราวคือเคสหลัก → ลอง 5 ครั้ง ห่างแบบ exponential
        // (30s, 1m, 2m, 4m) — เกินนั้นถือว่าล่มจริง งานค้างใน failed ให้ตรวจได้
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { age: 60 * 60, count: 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    })
  }
  return queue
}

// คืน true เมื่อเข้าคิวสำเร็จ — false = ไม่มี Redis/enqueue พัง ให้ผู้เรียกส่ง inline แทน
// (การส่งอีเมล "ช้าแต่ถึง" ดีกว่า "หายเงียบ" เสมอ)
export async function enqueueEmail(job: EmailJob): Promise<boolean> {
  const q = getEmailQueue()
  if (!q) return false
  try {
    await q.add(job.kind, job)
    return true
  } catch (err) {
    logger.error({ err, kind: job.kind }, "Failed to enqueue email — falling back to inline send")
    return false
  }
}
