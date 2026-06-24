import { CardRepository } from "../../domain/repositories/card.repository"
import { CardAssigneeRepository } from "../../domain/repositories/card-assignee.repository"
import { getCardInBoard } from "../utils/card-access.util"

export class ListAssigneesUseCase {
  constructor(
    private cardRepo: CardRepository,
    private assigneeRepo: CardAssigneeRepository
  ) {}

  async execute(organizationId: string, boardId: string, cardId: string) {
    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)
    return this.assigneeRepo.listByCard(cardId)
  }
}
