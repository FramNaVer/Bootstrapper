import { BoardRepository } from "../../domain/repositories/board.repository"
import { ActivityLogRepository } from "../../domain/repositories/activity-log.repository"
import { getBoardInOrg } from "../utils/board-access.util"

// ฟีดความเคลื่อนไหวของ board ("ใครทำอะไร เมื่อไหร่")
export class ListActivitiesUseCase {
  constructor(
    private boardRepo: BoardRepository,
    private activityRepo: ActivityLogRepository
  ) {}

  async execute(organizationId: string, boardId: string, limit = 50) {
    await getBoardInOrg(this.boardRepo, boardId, organizationId)
    return this.activityRepo.listByBoard(boardId, limit)
  }
}
