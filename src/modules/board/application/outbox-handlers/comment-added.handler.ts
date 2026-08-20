import { TransactionContext } from "@shared/database/unit-of-work"
import { OutboxHandler } from "@shared/outbox/outbox.processor"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"


export const COMMENT_ADDED_EVENT = "board.comment-added"

export interface CommentAddedPayload {
    organizationId: string
    boardId: string
    actorId: string
    cardId: string
    commentId: string
}

export function makeCommentAddedHandler(activityRepo: ActivityLogRepository): OutboxHandler {
    return async (payload: unknown, tx: TransactionContext) => {
        const p = payload as Partial<CommentAddedPayload>
        if(!p.organizationId || !p.boardId || !p.actorId || !p.cardId || !p.commentId) {
            throw new Error("comment-added payload missing fields")
        }

        await activityRepo.create({
            organizationId: p.organizationId,
            boardId: p.boardId,
            actorId: p.actorId,
            action: "COMMENT_ADDED",
            payload: { cardId: p.cardId, commentId: p.commentId }
        }, tx)
    }
}