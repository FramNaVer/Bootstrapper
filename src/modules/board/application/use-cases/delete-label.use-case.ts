import { BoardRepository } from "../../domain/repositories/board.repository"
import { LabelRepository } from "../../domain/repositories/label.repository"
import { getBoardInOrg } from "../utils/board-access.util"
import { getLabelInBoard } from "../utils/label-access.util"

export class DeleteLabelUseCase {
  constructor(
    private boardRepo: BoardRepository,
    private labelRepo: LabelRepository
  ) {}

  async execute(organizationId: string, boardId: string, labelId: string) {
    await getBoardInOrg(this.boardRepo, boardId, organizationId)
    await getLabelInBoard(this.labelRepo, labelId, boardId, organizationId)
    // ลบ label → CardLabel ที่อ้างถึงหลุดเองด้วย onDelete: Cascade
    await this.labelRepo.delete(labelId)
  }
}
