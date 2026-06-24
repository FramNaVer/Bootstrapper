import { ListRepository } from "../../domain/repositories/list.repository"
import { getListInBoard } from "../utils/list-access.util"

export class DeleteListUseCase {
  constructor(private listRepo: ListRepository) {}

  async execute(organizationId: string, boardId: string, listId: string) {
    await getListInBoard(this.listRepo, listId, boardId, organizationId)
    await this.listRepo.softDelete(listId)
  }
}
