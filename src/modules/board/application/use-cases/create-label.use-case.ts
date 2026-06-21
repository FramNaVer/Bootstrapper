import { ConflictError } from "@shared/errors/app.error"
import { BoardRepository } from "../../domain/repositories/board.repository"
import { LabelRepository } from "../../domain/repositories/label.repository"
import { getBoardInOrg } from "../utils/board-access.util"

export class CreateLabelUseCase {
  constructor(
    private boardRepo: BoardRepository,
    private labelRepo: LabelRepository
  ) {}

  async execute(
    organizationId: string,
    boardId: string,
    data: { name: string; color: string }
  ) {
    const board = await getBoardInOrg(this.boardRepo, boardId, organizationId)

    // ชื่อ label ห้ามซ้ำในกระดานเดียว (มี unique key ที่ DB — เช็คก่อนเพื่อ error ที่อ่านง่าย)
    const existing = await this.labelRepo.listByBoard(boardId)
    if (existing.some((l) => l.name.toLowerCase() === data.name.toLowerCase())) {
      throw new ConflictError("A label with this name already exists on the board")
    }

    return this.labelRepo.create({
      organizationId: board.organizationId,
      boardId,
      name: data.name,
      color: data.color,
    })
  }
}
