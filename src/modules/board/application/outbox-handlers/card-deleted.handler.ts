// =============================================================
// Outbox handler: board.card-delete → เขียน activity log
// =============================================================
import { TransactionContext } from "@shared/database/unit-of-work"
import { OutboxHandler } from "@shared/outbox/outbox.processor"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"

export const CARD_DELETED_EVENT = "board.card-deleted"

export interface CardDeletedPayload {
    organizationId: string
    boardId: string
    actorId: string
    cardId: string
    title: string
    listId: string
}

export function makeCardDeleteHandler(activityRepo: ActivityLogRepository): OutboxHandler {
    return async (payload: unknown, tx: TransactionContext) => {
        const p = payload as Partial<CardDeletedPayload>
        if(!p.organizationId || !p.boardId || !p.actorId || !p.cardId || !p.listId) {
            throw new Error("card-delete payload missing fields")
        }

        await activityRepo.create({
            organizationId: p.organizationId,
            boardId: p.boardId,
            actorId: p.actorId,
            action: "CARD_DELETED",
            payload: {
                cardId: p.cardId,
                title: p.title,
                listId: p.listId
            }
        }, tx)
    }
}