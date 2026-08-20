// Outbox handler: board.list-create → เขียน activity log
import { TransactionContext } from "@shared/database/unit-of-work"
import { OutboxHandler } from "@shared/outbox/outbox.processor"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"

export const LIST_CREATED_EVENT = "board.list-created"

export interface ListCreatedPayload {
    organizationId: string
    boardId: string
    actorId: string
    listId: string
    name: string
}

export function makeListCreateHandler(activityRepo: ActivityLogRepository): OutboxHandler {
    return async (payload: unknown, tx: TransactionContext) => {
        const p = payload as Partial<ListCreatedPayload>
        if(!p.organizationId || !p.boardId || !p.actorId || !p.listId || !p.name) {
            throw new Error("list-create payload missing fields")
        }

        await activityRepo.create({
            organizationId: p.organizationId,
            boardId: p.boardId,
            actorId: p.actorId,
            action: "LIST_CREATED",
            payload: {
                listId: p.listId,
                name: p.name
            }
        }, tx)
    }
}