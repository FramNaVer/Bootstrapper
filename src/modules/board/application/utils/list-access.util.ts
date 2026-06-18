import { NotFoundError } from "@shared/errors/app.error"
import { ListRepository } from "../../domain/repositories/list.repository"
import { ListEntity } from "../../domain/entities/list.entity"

// ดึง list พร้อมการันตีว่าอยู่ใน board และ org ที่ถูกต้อง (กัน IDOR ข้าม board/tenant)
export async function getListInBoard(
  listRepo: ListRepository,
  listId: string,
  boardId: string,
  organizationId: string
): Promise<ListEntity> {
  const list = await listRepo.findById(listId)
  if (
    !list ||
    list.boardId !== boardId ||
    list.organizationId !== organizationId
  ) {
    throw new NotFoundError("List")
  }
  return list
}
