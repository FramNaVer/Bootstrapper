// =============================================================
// Outbox handler: board.card-moved → เขียน activity log
// =============================================================
// ครึ่งหลังของ outbox pattern (ครึ่งแรกคือ use case เขียน event ใน
// transaction เดียวกับ mutation) — handler รันทีหลังโดย worker พร้อม retry
//
// สัญญาของ event อยู่ที่ไฟล์นี้ไฟล์เดียว: ชื่อ type + รูปร่าง payload
// producer (move-card.use-case) import จากที่นี่ → เปลี่ยนแล้วชนกันไม่ได้
import { TransactionContext } from "@shared/database/unit-of-work"
import { OutboxHandler } from "@shared/outbox/outbox.processor"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"

export const CARD_MOVED_EVENT = "board.card-moved"

export interface CardMovedPayload {
  organizationId: string
  boardId: string
  actorId: string
  cardId: string
  fromListId: string
  toListId: string
}

export function makeCardMovedHandler(
  activityRepo: ActivityLogRepository
): OutboxHandler {
  return async (payload: unknown, tx: TransactionContext) => {
    // payload มาจาก JSON ใน DB — ตรวจ field ที่ต้องใช้ก่อน ไม่เชื่อ type ลอยๆ
    const p = payload as Partial<CardMovedPayload>
    if (!p.organizationId || !p.boardId || !p.actorId || !p.cardId) {
      throw new Error("card-moved payload is missing required fields")
    }

    await activityRepo.create(
      {
        organizationId: p.organizationId,
        boardId: p.boardId,
        actorId: p.actorId,
        action: "CARD_MOVED",
        payload: {
          cardId: p.cardId,
          fromListId: p.fromListId,
          toListId: p.toListId,
        },
      },
      tx
    )
  }
}
