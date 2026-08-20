import {TransactionContext} from "@shared/database/unit-of-work"
import {OutboxHandler} from "@shared/outbox/outbox.processor"
import {ActivityLogRepository} from "../../domain/repositories/activity-log.repository"

export const LIST_RENAMED_EVENT = "board.list-renamed"

export interface ListRenamedPayload {
    organizationId: string
    boardId: string
    actorId: string
    listId: string
    name: string
}

export function makeListRenameHandler(activityRepo: ActivityLogRepository): OutboxHandler {
    return async (payload: unknown, tx: TransactionContext) => {
        const p = payload as Partial<ListRenamedPayload>
        if(!p.organizationId || !p.boardId || !p.actorId || !p.listId || !p.name) {
            throw new Error("list-rename payload missing fields")
        }

        await activityRepo.create({
            organizationId: p.organizationId,
            boardId: p.boardId,
            actorId: p.actorId,
            action: "LIST_RENAMED",
            payload: {
                listId: p.listId,
                name: p.name
            }
        }, tx)
    }
}