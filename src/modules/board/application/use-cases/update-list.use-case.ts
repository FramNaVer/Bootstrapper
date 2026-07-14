import { ListRepository } from "../../domain/repositories/list.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getListInBoard } from "../utils/list-access.util"
import { needsRebalance, rebalancedPositions } from "../utils/position.util"

// รองรับเปลี่ยนชื่อ และ/หรือ ย้ายตำแหน่งคอลัมน์ (position)
export class UpdateListUseCase {
  constructor(
    private listRepo: ListRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(
    organizationId: string,
    boardId: string,
    listId: string,
    actorId: string,
    data: { name?: string; position?: number }
  ) {
    await getListInBoard(this.listRepo, listId, boardId, organizationId)
    const list = await this.listRepo.update(listId, data)

    // ย้ายตำแหน่งคอลัมน์ = แทรกกลางแบบเดียวกับการ์ด → gap หมดได้เหมือนกัน
    // (เกิดยากกว่าเพราะคอลัมน์มีน้อย แต่กันด้วยกติกาเดียวกัน — ดู position.util)
    if (data.position !== undefined) {
      const listsInBoard = await this.listRepo.listByBoard(boardId)
      if (needsRebalance(listsInBoard.map((l) => l.position))) {
        await this.listRepo.updatePositions(rebalancedPositions(listsInBoard))
      }
    }

    // log เฉพาะตอน "เปลี่ยนชื่อ" — ย้ายตำแหน่งเฉยๆ ไม่ต้องลงฟีด (รก)
    if (data.name !== undefined) {
      await this.activityRepo.create({
        organizationId,
        boardId,
        actorId,
        action: "LIST_RENAMED",
        payload: { listId, name: list.name },
      })
    }

    return list
  }
}
