import { CardRepository } from "../../domain/repositories/card.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getCardInBoard } from "../utils/card-access.util"

// แก้เนื้อหาการ์ด (title/description/dueDate) — ไม่รวมการย้าย list (ดู move-card)
export class UpdateCardUseCase {
  constructor(
    private cardRepo: CardRepository,
    private activityRepo: ActivityLogRepository
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

    const card = await this.cardRepo.update(cardId, {
      title: params.title,
      description: params.description,
      dueDate: params.dueDate,
    })

    await this.activityRepo.create({
      organizationId,
      boardId,
      actorId,
      action: "CARD_UPDATED",
      payload: { cardId, title: card.title },
    })

    return card
  }
}
