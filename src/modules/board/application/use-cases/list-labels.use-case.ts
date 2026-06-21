import { BoardRepository } from "../../domain/repositories/board.repository"
import { LabelRepository } from "../../domain/repositories/label.repository"
import { getBoardInOrg } from "../utils/board-access.util"

export class ListLabelsUseCase {
  constructor(
    private boardRepo: BoardRepository,
    private labelRepo: LabelRepository
  ) {}

  async execute(organizationId: string, boardId: string) {
    await getBoardInOrg(this.boardRepo, boardId, organizationId)
    return this.labelRepo.listByBoard(boardId)
  }
}
