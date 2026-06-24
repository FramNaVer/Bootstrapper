import { CardRepository } from "../../domain/repositories/card.repository"
import { getCardInBoard } from "../utils/card-access.util"

export class GetCardUseCase {
  constructor(private cardRepo: CardRepository) {}

  async execute(organizationId: string, boardId: string, cardId: string) {
    return getCardInBoard(this.cardRepo, cardId, boardId, organizationId)
  }
}
