import { ListRepository } from "../../domain/repositories/list.repository"
import { CardRepository } from "../../domain/repositories/card.repository"
import { getListInBoard } from "../utils/list-access.util"

// ลบคอลัมน์ + การ์ดข้างในทั้งหมด (cascade soft-delete) → ไม่มีการ์ดลอยค้างใน DB
export class DeleteListUseCase {
  constructor(
    private listRepo: ListRepository,
    private cardRepo: CardRepository
  ) {}

  async execute(organizationId: string, boardId: string, listId: string) {
    await getListInBoard(this.listRepo, listId, boardId, organizationId)
    await this.cardRepo.softDeleteByList(listId)
    await this.listRepo.softDelete(listId)
  }
}
