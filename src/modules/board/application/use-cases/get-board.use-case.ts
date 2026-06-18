import { BoardRepository } from "../../domain/repositories/board.repository"
import { getBoardInOrg } from "../utils/board-access.util"

export class GetBoardUseCase {
  constructor(private boardRepo: BoardRepository) {}

  async execute(organizationId: string, boardId: string) {
    return getBoardInOrg(this.boardRepo, boardId, organizationId)
  }
}
