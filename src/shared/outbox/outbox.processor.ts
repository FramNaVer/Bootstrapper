// =============================================================
// Outbox Processor — หยิบ event ที่จองได้มา dispatch เข้า handler ตาม type
// =============================================================
// exactly-once (ในทางปฏิบัติ): handler ทำงาน + markProcessed อยู่ใน
// transaction เดียวกัน — ถ้า handler พังกลางทาง ทั้งคู่ rollback
// event ถูกปล่อยคืน (claim หมดอายุ) แล้วลองใหม่จนกว่า attempts จะครบเพดาน
import { logger } from "@shared/logging/logger"
import { TransactionContext, UnitOfWork } from "@shared/database/unit-of-work"
import { OutboxRepository } from "./outbox.repository"

// handler รับ payload (ต้อง narrow type เอง) + tx สำหรับเขียน DB ใน transaction
export type OutboxHandler = (
  payload: unknown,
  tx: TransactionContext
) => Promise<void>

export class OutboxProcessor {
  constructor(
    private outboxRepo: OutboxRepository,
    private uow: UnitOfWork,
    private handlers: Record<string, OutboxHandler>
  ) {}

  // คืนจำนวน event ที่หยิบมา — ผู้เรียกใช้ตัดสินว่ายังมีงานค้างต้องวนต่อไหม
  async processBatch(limit = 10): Promise<number> {
    const events = await this.outboxRepo.claimBatch(limit)

    for (const event of events) {
      const handler = this.handlers[event.type]
      try {
        if (!handler) {
          // type ที่ไม่มี handler = producer กับ worker ตกลงกันไม่ตรง (bug)
          throw new Error(`No outbox handler registered for type: ${event.type}`)
        }
        await this.uow.run(async (tx) => {
          await handler(event.payload, tx)
          await this.outboxRepo.markProcessed(event.id, tx)
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await this.outboxRepo.markFailed(event.id, message)
        logger.error(
          { err, eventId: event.id, eventType: event.type },
          "Outbox event processing failed"
        )
      }
    }

    return events.length
  }
}
