import { ListRepository } from "../../domain/repositories/list.repository"
import { CardRepository } from "../../domain/repositories/card.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getListInBoard } from "../utils/list-access.util"

// ลบคอลัมน์ + การ์ดข้างในทั้งหมด (cascade soft-delete) → ไม่มีการ์ดลอยค้างใน DB
export class DeleteListUseCase {
  constructor(
    private listRepo: ListRepository,
    private cardRepo: CardRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(
    organizationId: string,
    boardId: string,
    listId: string,
    actorId: string
  ) {
    // เก็บชื่อไว้ลงฟีดก่อนลบ (หลังลบจะอ่านไม่ได้)
    const list = await getListInBoard(
      this.listRepo,
      listId,
      boardId,
      organizationId
    )
    await this.cardRepo.softDeleteByList(listId)
    await this.listRepo.softDelete(listId)

    await this.activityRepo.create({
      organizationId,
      boardId,
      actorId,
      action: "LIST_DELETED",
      payload: { listId, name: list.name },
    })
  }
}
