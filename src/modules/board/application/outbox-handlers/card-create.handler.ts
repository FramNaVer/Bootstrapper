// =============================================================
// Outbox handler: board.card-create → เขียน activity log
// =============================================================
import { TransactionContext } from "@shared/database/unit-of-work"
import { OutboxHandler } from "@shared/outbox/outbox.processor"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"

export const CARD_CREATED_EVENT = "board.card-created"

export interface CardCreatedPayload {
    organizationId: string
    boardId: string
    actorId: string
    cardId: string
    title: string
    listId: string
}

export function makeCardCreateHandler(activityRepo: ActivityLogRepository): OutboxHandler {
    return async (payload: unknown, tx: TransactionContext) => {
        const p = payload as Partial<CardCreatedPayload>
        if(!p.organizationId || !p.boardId || !p.actorId || !p.cardId || !p.title || !p.listId) {
            throw new Error("card-create payload missing fields")
        }

        await activityRepo.create({
            organizationId: p.organizationId,
            boardId: p.boardId,
            actorId: p.actorId,
            action: "CARD_CREATED",
            payload: {
                cardId: p.cardId,
                title: p.title,
                listId: p.listId
            }
        })
    }
}