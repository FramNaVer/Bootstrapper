import { ListRepository } from "../../domain/repositories/list.repository"
import { getListInBoard } from "../utils/list-access.util"
import { needsRebalance, rebalancedPositions } from "../utils/position.util"
import { UnitOfWork } from "@shared/database/unit-of-work"
import { OutboxRepository } from "@shared/outbox/outbox.repository"
import {
  LIST_RENAMED_EVENT,
  ListRenamedPayload
} from "../outbox-handlers/list-renamed.handler"


// รองรับเปลี่ยนชื่อ และ/หรือ ย้ายตำแหน่งคอลัมน์ (position)
export class UpdateListUseCase {
  constructor(
    private listRepo: ListRepository,
    private uow: UnitOfWork,
    private outboxRepo: OutboxRepository
  ) { }

  async execute(
    organizationId: string,
    boardId: string,
    listId: string,
    actorId: string,
    data: { name?: string; position?: number }
  ) {
    await getListInBoard(this.listRepo, listId, boardId, organizationId)

    // ถ้าเปลี่ยนชื่อ ให้บันทึก activity log และส่ง outbox event
    const list = await this.uow.run(async (tx) => {
      const updated = await this.listRepo.update(listId, data, tx)

      //เขียน event ตอนเปลี่ยนชื่อ list
      if (data.name !== undefined) {
        const payload: ListRenamedPayload = {
          organizationId,
          boardId,
          actorId,
          listId,
          name: updated.name,
        }

        await this.outboxRepo.create({
          type: LIST_RENAMED_EVENT,
          payload,
        },
          tx
        )
      }
      return updated
    })

    //rebalance เหมือน move-card
    if (data.position !== undefined) {
      const listsInBoard = await this.listRepo.listByBoard(boardId)
      if (needsRebalance(listsInBoard.map((l) => l.position))) {
        await this.listRepo.updatePositions(rebalancedPositions(listsInBoard))
      }
    }
    return list
  }
}
