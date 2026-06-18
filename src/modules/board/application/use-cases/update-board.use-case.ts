import { BoardRepository } from "../../domain/repositories/board.repository"
import { getBoardInOrg } from "../utils/board-access.util"

export class UpdateBoardUseCase {
  constructor(private boardRepo: BoardRepository) {}

  async execute(
    organizationId: string,
    boardId: string,
    data: { name?: string; description?: string | null }
  ) {
    // ยืนยันก่อนว่า board นี้อยู่ใน org ที่เรียก (กัน IDOR ข้าม tenant)
    await getBoardInOrg(this.boardRepo, boardId, organizationId)
    return this.boardRepo.update(boardId, data)
  }
}
