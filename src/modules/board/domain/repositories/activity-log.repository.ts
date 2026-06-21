import { ActionType, ActivityLogEntity } from "../entities/activity-log.entity"

export interface ActivityLogRepository {
  create(data: {
    organizationId: string
    boardId: string
    actorId: string
    action: ActionType
    payload?: unknown
  }): Promise<void>

  // ฟีดล่าสุดของ board เรียงใหม่→เก่า (limit กันดึงทั้งหมด)
  listByBoard(boardId: string, limit?: number): Promise<ActivityLogEntity[]>
}
