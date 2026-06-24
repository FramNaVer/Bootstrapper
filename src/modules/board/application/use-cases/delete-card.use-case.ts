import { CardRepository } from "../../domain/repositories/card.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getCardInBoard } from "../utils/card-access.util"

export class DeleteCardUseCase {
  constructor(
    private cardRepo: CardRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    actorId: string
  }) {
    const { organizationId, boardId, cardId, actorId } = params

    const card = await getCardInBoard(
      this.cardRepo,
      cardId,
      boardId,
      organizationId
    )
    await this.cardRepo.softDelete(cardId)

    await this.activityRepo.create({
      organizationId,
      boardId,
      actorId,
      action: "CARD_DELETED",
      payload: { cardId, title: card.title },
    })
  }
}
