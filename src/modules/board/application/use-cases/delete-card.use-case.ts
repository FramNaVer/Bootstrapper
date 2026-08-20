import { CardRepository } from "../../domain/repositories/card.repository"
import { getCardInBoard } from "../utils/card-access.util"
import { UnitOfWork } from "@shared/database/unit-of-work"
import { OutboxRepository } from "@shared/outbox/outbox.repository"
import {
  CARD_DELETED_EVENT,
  CardDeletedPayload,
} from "../outbox-handlers/card-deleted.handler"



export class DeleteCardUseCase {
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
  }) {
    const { organizationId, boardId, cardId, actorId } = params

    const card = await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)

    const payload: CardDeletedPayload = {
      organizationId,
      boardId,
      actorId,
      cardId,
      title: card.title,
      listId: card.listId,
    }

    await this.uow.run(async (tx) => {
      await this.cardRepo.softDelete(cardId, tx)
      await this.outboxRepo.create({
        type: CARD_DELETED_EVENT,
        payload,
      }, tx)
    })
  }
}
