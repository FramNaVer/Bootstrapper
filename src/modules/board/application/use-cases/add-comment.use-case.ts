import { CardRepository } from "../../domain/repositories/card.repository"
import { CommentRepository } from "../../domain/repositories/comment.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getCardInBoard } from "../utils/card-access.util"

export class AddCommentUseCase {
  constructor(
    private cardRepo: CardRepository,
    private commentRepo: CommentRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    authorId: string
    body: string
  }) {
    const { organizationId, boardId, cardId, authorId, body } = params

    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)

    const comment = await this.commentRepo.create({
      organizationId,
      cardId,
      authorId,
      body,
    })

    await this.activityRepo.create({
      organizationId,
      boardId,
      actorId: authorId,
      action: "COMMENT_ADDED",
      payload: { cardId, commentId: comment.id },
    })

    return comment
  }
}
