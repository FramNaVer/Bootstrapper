import { CardRepository } from "../../domain/repositories/card.repository"
import { CommentRepository } from "../../domain/repositories/comment.repository"
import { getCardInBoard } from "../utils/card-access.util"

export class ListCommentsUseCase {
  constructor(
    private cardRepo: CardRepository,
    private commentRepo: CommentRepository
  ) {}

  async execute(organizationId: string, boardId: string, cardId: string) {
    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)
    return this.commentRepo.listByCard(cardId)
  }
}
