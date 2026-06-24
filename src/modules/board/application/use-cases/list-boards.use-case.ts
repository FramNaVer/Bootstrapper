import { BoardRepository } from "../../domain/repositories/board.repository"

// board ทั้งหมดของ org (ผู้เรียกต้องเป็นสมาชิก — เช็คโดย RBAC middleware)
export class ListBoardsUseCase {
  constructor(private boardRepo: BoardRepository) {}

  async execute(organizationId: string) {
    return this.boardRepo.listByOrg(organizationId)
  }
}
