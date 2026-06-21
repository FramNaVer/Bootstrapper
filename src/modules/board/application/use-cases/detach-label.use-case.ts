import { NotFoundError } from "@shared/errors/app.error"
import { CardRepository } from "../../domain/repositories/card.repository"
import { LabelRepository } from "../../domain/repositories/label.repository"
import { getCardInBoard } from "../utils/card-access.util"
import { getLabelInBoard } from "../utils/label-access.util"

export class DetachLabelUseCase {
  constructor(
    private cardRepo: CardRepository,
    private labelRepo: LabelRepository
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    labelId: string
  }) {
    const { organizationId, boardId, cardId, labelId } = params

    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)
    await getLabelInBoard(this.labelRepo, labelId, boardId, organizationId)

    if (!(await this.labelRepo.isAttached(cardId, labelId))) {
      throw new NotFoundError("Label attachment")
    }

    await this.labelRepo.detachFromCard(cardId, labelId)
  }
}
