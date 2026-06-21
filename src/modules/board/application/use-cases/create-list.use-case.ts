import { BoardRepository } from "../../domain/repositories/board.repository"
import { ListRepository } from "../../domain/repositories/list.repository"
import { getBoardInOrg } from "../utils/board-access.util"

// เว้นช่องว่างระหว่าง position แต่ละ list ไว้กว้างๆ
// เผื่อแทรก list ใหม่ "ตรงกลาง" ภายหลังโดยไม่ต้องขยับตัวอื่น (เช่น 1000, 2000 → แทรก 1500)
const POSITION_GAP = 1000

export class CreateListUseCase {
  constructor(
    private boardRepo: BoardRepository,
    private listRepo: ListRepository
  ) {}

  async execute(
    organizationId: string,
    boardId: string,
    data: { name: string }
  ) {
    const board = await getBoardInOrg(this.boardRepo, boardId, organizationId)

    // list ใหม่ไปต่อท้ายเสมอ: position = ตัวมากสุด + ช่องว่าง
    const maxPosition = await this.listRepo.getMaxPosition(boardId)
    const position = (maxPosition ?? 0) + POSITION_GAP

    return this.listRepo.create({
      organizationId: board.organizationId,
      boardId,
      name: data.name,
      position,
    })
  }
}
