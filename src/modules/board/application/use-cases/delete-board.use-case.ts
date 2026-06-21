import { BoardRepository } from "../../domain/repositories/board.repository"
import { getBoardInOrg } from "../utils/board-access.util"

export class DeleteBoardUseCase {
  constructor(private boardRepo: BoardRepository) {}

  async execute(organizationId: string, boardId: string) {
    await getBoardInOrg(this.boardRepo, boardId, organizationId)
    // soft delete — list/card ข้างใน "ถือว่าหาย" ที่ชั้น query (filter deletedAt)
    // แต่แถวจริงยังอยู่ จึงกู้คืนทั้งกระดานได้ภายหลัง
    await this.boardRepo.softDelete(boardId)
  }
}
