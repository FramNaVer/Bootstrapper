import { NotFoundError } from "@shared/errors/app.error"
import { LabelRepository } from "../../domain/repositories/label.repository"
import { LabelEntity } from "../../domain/entities/label.entity"

// ดึง label พร้อมการันตีว่าอยู่ใน board และ org ที่ถูกต้อง (กัน IDOR ข้าม board/tenant)
export async function getLabelInBoard(
  labelRepo: LabelRepository,
  labelId: string,
  boardId: string,
  organizationId: string
): Promise<LabelEntity> {
  const label = await labelRepo.findById(labelId)
  if (
    !label ||
    label.boardId !== boardId ||
    label.organizationId !== organizationId
  ) {
    throw new NotFoundError("Label")
  }
  return label
}
