import { TransactionContext } from "@shared/database/unit-of-work"
import {
  ActionType,
  ActivityLogWithActor,
} from "../entities/activity-log.entity"

export interface ActivityLogRepository {
  // ctx: ให้ outbox handler เขียน log ใน transaction เดียวกับ markProcessed
  // (สำเร็จด้วยกัน/ล้มด้วยกัน — ไม่มี log ซ้ำตอน retry)
  create(
    data: {
      organizationId: string
      boardId: string
      actorId: string
      action: ActionType
      payload?: unknown
    },
    ctx?: TransactionContext
  ): Promise<void>

  // ฟีดล่าสุดของ board เรียงใหม่→เก่า (limit กันดึงทั้งหมด) พร้อมชื่อคนทำ
  listByBoard(boardId: string, limit?: number): Promise<ActivityLogWithActor[]>
}
