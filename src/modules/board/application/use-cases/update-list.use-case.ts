import { ListRepository } from "../../domain/repositories/list.repository"
import { getListInBoard } from "../utils/list-access.util"

// รองรับเปลี่ยนชื่อ และ/หรือ ย้ายตำแหน่งคอลัมน์ (position)
export class UpdateListUseCase {
  constructor(private listRepo: ListRepository) {}

  async execute(
    organizationId: string,
    boardId: string,
    listId: string,
    data: { name?: string; position?: number }
  ) {
    await getListInBoard(this.listRepo, listId, boardId, organizationId)
    return this.listRepo.update(listId, data)
  }
}
