import { CardRepository } from "../../domain/repositories/card.repository"
import { ListRepository } from "../../domain/repositories/list.repository"
import { getListInBoard } from "../utils/list-access.util"
import { UnitOfWork } from "@shared/database/unit-of-work"
import { OutboxRepository } from "@shared/outbox/outbox.repository"
import {
  CARD_CREATED_EVENT,
  CardCreatedPayload,
} from "../outbox-handlers/card-created.handler"

const POSITION_GAP = 1000

export class CreateCardUseCase {
  constructor(
    private cardRepo: CardRepository,
    private listRepo: ListRepository,
    private uow: UnitOfWork,
    private outboxRepo: OutboxRepository
  ) { }

  async execute(params: {
    organizationId: string
    boardId: string
    listId: string
    actorId: string
    title: string
    description?: string | null
  }) {
    const { organizationId, boardId, listId, actorId } = params

    // ยืนยันว่า list ปลายทางอยู่ใน board+org ที่เรียก (กัน IDOR)
    await getListInBoard(this.listRepo, listId, boardId, organizationId)

    // การ์ดใหม่ต่อท้าย list: position = ตัวมากสุดใน list นั้น + ช่องว่าง
    const maxPosition = await this.cardRepo.getMaxPosition(listId)
    const position = (maxPosition ?? 0) + POSITION_GAP

    const card = await this.uow.run(async (tx) => {
      const created = await this.cardRepo.create({
        organizationId,
        boardId,
        listId,
        position,
        title: params.title,
        description: params.description ?? null,
      },
        tx
      )

      const payload: CardCreatedPayload = {
        organizationId,
        boardId,
        actorId,
        cardId: created.id,
        title: created.title,
        listId: created.listId,
      }

      await this.outboxRepo.create({
        type: CARD_CREATED_EVENT,
        payload,
      }, tx)

      return created
    })

    return card
  }
}
