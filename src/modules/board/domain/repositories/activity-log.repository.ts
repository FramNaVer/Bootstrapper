import {
  ActionType,
  ActivityLogWithActor,
} from "../entities/activity-log.entity"

export interface ActivityLogRepository {
  create(data: {
    organizationId: string
    boardId: string
    actorId: string
    action: ActionType
    payload?: unknown
  }): Promise<void>

  // ฟีดล่าสุดของ board เรียงใหม่→เก่า (limit กันดึงทั้งหมด) พร้อมชื่อคนทำ
  listByBoard(boardId: string, limit?: number): Promise<ActivityLogWithActor[]>
}
