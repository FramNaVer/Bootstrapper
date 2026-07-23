import { CardRepository } from "../../domain/repositories/card.repository"
import { CommentRepository } from "../../domain/repositories/comment.repository"
import { getCardInBoard } from "../utils/card-access.util"
import { UnitOfWork } from "@shared/database/unit-of-work"
import { OutboxRepository } from "@shared/outbox/outbox.repository"
import {
  COMMENT_ADDED_EVENT,
  CommentAddedPayload
} from "../outbox-handlers/comment-added.handler"

export class AddCommentUseCase {
  constructor(
    private cardRepo: CardRepository,
    private commentRepo: CommentRepository,
    private uow: UnitOfWork,
    private outboxRepo: OutboxRepository
  ) { }

  async execute(params: {
    organizationId: string
    boardId: string
    cardId: string
    authorId: string
    body: string
  }) {
    const { organizationId, boardId, cardId, authorId, body } = params

    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)

    const comment = await this.uow.run(async (tx) => {
      const created = await this.commentRepo.create({
        organizationId,
        cardId,
        authorId,
        body,
      }, tx)

      const payload: CommentAddedPayload = {
        organizationId,
        boardId,
        actorId: authorId,
        cardId,
        commentId: created.id
      }

      await this.outboxRepo.create({
        type: COMMENT_ADDED_EVENT,
        payload
      }, tx)
      return created
    })

    return comment
  }
}
