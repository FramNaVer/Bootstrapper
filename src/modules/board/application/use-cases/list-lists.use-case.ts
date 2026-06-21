import { BoardRepository } from "../../domain/repositories/board.repository"
import { ListRepository } from "../../domain/repositories/list.repository"
import { getBoardInOrg } from "../utils/board-access.util"

export class ListListsUseCase {
  constructor(
    private boardRepo: BoardRepository,
    private listRepo: ListRepository
  ) {}

  async execute(organizationId: string, boardId: string) {
    await getBoardInOrg(this.boardRepo, boardId, organizationId)
    return this.listRepo.listByBoard(boardId)
  }
}
