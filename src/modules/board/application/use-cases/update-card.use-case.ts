import { CardRepository } from "../../domain/repositories/card.repository"
import { getCardInBoard } from "../utils/card-access.util"
import { UnitOfWork } from "@shared/database/unit-of-work"
import { OutboxRepository } from "@shared/outbox/outbox.repository"
import {
  CARD_UPDATED_EVENT,
  CardUpdatedPayload,
} from "../outbox-handlers/card-updated.handler"


// แก้เนื้อหาการ์ด (title/description/dueDate) — ไม่รวมการย้าย list (ดู move-card)
export class UpdateCardUseCase {
  constructor(
    private cardRepo: CardRepository,
    private uow: UnitOfWork,
    private outboxRepo: OutboxRepository,
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    actorId: string
    title?: string
    description?: string | null
    dueDate?: Date | null
  }) {
    const { organizationId, boardId, cardId, actorId } = params

    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)

    const  card = await this.uow.run(async (tx) => {
      const updated = await this.cardRepo.update(cardId, {
        title: params.title,
        description: params.description,
        dueDate: params.dueDate,
      }, tx)

      const payload: CardUpdatedPayload = {
        organizationId,
        boardId,
        cardId,
        actorId,
        title: updated.title,
      }
      await this.outboxRepo.create({
        type: CARD_UPDATED_EVENT,
        payload,
      }, tx)

      return updated
    })

    return card
  }
}
