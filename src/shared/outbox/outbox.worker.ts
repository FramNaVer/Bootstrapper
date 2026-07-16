// =============================================================
// Outbox Worker — ตัวกำหนดจังหวะว่า processor จะถูกเรียกเมื่อไหร่
// =============================================================
// มี Redis   → BullMQ: repeatable job ทุก 10 วิ (กวาดของค้าง — การันตีว่า
//              ไม่มี event ถูกลืมแม้ instance ที่สร้างมันตายไป) + "nudge"
//              หลัง mutation สำเร็จเพื่อให้ activity โผล่แทบทันที
// ไม่มี Redis → interval poller ใน process เดียว ทำงานเหมือนกันทุกอย่าง
//              (ความหน่วงสูงสุด ~5 วิ) — dev/deploy ที่ยังไม่มี Redis ไม่พังอะไร
//
// ทับซ้อนกันได้ไหม? drain หลายตัวพร้อมกันปลอดภัยเสมอ เพราะ claimBatch
// ใช้ FOR UPDATE SKIP LOCKED — งานหนึ่งชิ้นมีเจ้าของคนเดียว
import { Queue, Worker } from "bullmq"
import { logger } from "@shared/logging/logger"
import {
  createBullConnection,
  isRedisEnabled,
} from "@shared/queue/redis.connection"
import { OutboxProcessor } from "./outbox.processor"

const OUTBOX_QUEUE_NAME = "outbox"
const DRAIN_EVERY_MS = 10_000
const FALLBACK_POLL_MS = 5_000

// ให้ presentation layer "กดกริ่ง" ได้โดยไม่ต้องรู้ว่าข้างหลังคือ BullMQ
// หรือ poller (ก่อน init เป็น no-op — ไม่มี worker ก็ไม่มีอะไรให้เรียก)
let nudge: () => void = () => {}

export function nudgeOutboxDrain(): void {
  nudge()
}

export function initOutboxWorker(processor: OutboxProcessor): void {
  // วนจนคิวเกลี้ยง — batch ละ 10 กันเคสงานสะสมเยอะแล้วรอบเดียวไม่หมด
  const drain = async () => {
    while ((await processor.processBatch()) > 0) {
      // no-op: เงื่อนไข while คืองานทั้งหมด
    }
  }

  if (!isRedisEnabled()) {
    // โหมด single-instance: poller ธรรมดา + กันวิ่งซ้อนกันใน process เดียว
    let draining = false
    const safeDrain = () => {
      if (draining) return
      draining = true
      drain()
        .catch((err) => logger.error({ err }, "Outbox drain failed"))
        .finally(() => {
          draining = false
        })
    }
    setInterval(safeDrain, FALLBACK_POLL_MS)
    nudge = safeDrain
    logger.info("Outbox worker started (interval poller — no REDIS_URL)")
    return
  }

  const queue = new Queue(OUTBOX_QUEUE_NAME, {
    connection: createBullConnection(),
    defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
  })

  // concurrency 1: drain วนจนเกลี้ยงอยู่แล้ว รันหลายตัวใน instance เดียวไม่มีประโยชน์
  new Worker(OUTBOX_QUEUE_NAME, drain, {
    connection: createBullConnection(),
    concurrency: 1,
  })

  queue
    .upsertJobScheduler("outbox-drain", { every: DRAIN_EVERY_MS })
    .catch((err) => logger.error({ err }, "Failed to schedule outbox drain"))

  // jobId คงที่ = กริ่งที่กดรัวๆ ยุบเหลืองานเดียว (งานที่วิ่งอยู่กวาดให้หมดเอง)
  nudge = () => {
    queue
      .add("nudge", {}, { jobId: "outbox-nudge" })
      .catch((err) => logger.error({ err }, "Failed to nudge outbox drain"))
  }

  logger.info("Outbox worker started (BullMQ)")
}
