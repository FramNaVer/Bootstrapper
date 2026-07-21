import { TransactionContext } from "@shared/database/unit-of-work"
import { OutboxHandler } from "@shared/outbox/outbox.processor"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"

export const CARD_UPDATED_EVENT = "board.card-updated"

export interface CardUpdatedPayload {
    organizationId: string
    boardId: string
    cardId: string
    actorId: string
    title: string
}

export function makeCardUpdateHandler(activityRepo: ActivityLogRepository): OutboxHandler {
    return async (payload: unknown, tx: TransactionContext) => {
        const p = payload as Partial<CardUpdatedPayload>
        if (!p.organizationId || !p.boardId || !p.actorId || !p.cardId) {
            throw new Error("card-updated payload missing fields")
        }
        await activityRepo.create(
            {
                organizationId: p.organizationId,
                boardId: p.boardId,
                actorId: p.actorId,
                action: "CARD_UPDATED",
                payload: { cardId: p.cardId, title: p.title },
            },
            tx
        )
    }
}