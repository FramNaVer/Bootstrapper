import { BoardRepository } from "../../domain/repositories/board.repository"
import { CardRepository } from "../../domain/repositories/card.repository"
import { getBoardInOrg } from "../utils/board-access.util"

// การ์ดทั้งหมดของ board (client นำไปจัดกลุ่มตาม listId เพื่อแสดงเป็นคอลัมน์)
export class ListCardsUseCase {
  constructor(
    private boardRepo: BoardRepository,
    private cardRepo: CardRepository
  ) {}

  async execute(organizationId: string, boardId: string) {
    await getBoardInOrg(this.boardRepo, boardId, organizationId)
    return this.cardRepo.listByBoard(boardId)
  }
}
