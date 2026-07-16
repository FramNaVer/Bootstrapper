// =============================================================
// Outbox Repository — สัญญาการอ่าน/เขียนตาราง OutboxEvent
// =============================================================
import { TransactionContext } from "@shared/database/unit-of-work"

export interface OutboxEventInput {
  type: string
  payload: unknown
}

export interface ClaimedOutboxEvent {
  id: string
  type: string
  payload: unknown
}

export interface OutboxRepository {
  // เขียน event — ต้องเรียกด้วย ctx ของ transaction เดียวกับ mutation เสมอ
  // (นั่นคือหัวใจของ outbox: mutation กับ event เกิด/ตายด้วยกัน)
  create(event: OutboxEventInput, ctx?: TransactionContext): Promise<void>

  // จอง event ที่ยังไม่ถูกทำ (atomic ข้าม instance) — คนจองได้เป็นคนทำ
  claimBatch(limit: number): Promise<ClaimedOutboxEvent[]>

  markProcessed(id: string, ctx?: TransactionContext): Promise<void>

  markFailed(id: string, error: string): Promise<void>
}
