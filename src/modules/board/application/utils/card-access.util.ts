import { NotFoundError } from "@shared/errors/app.error"
import { CardRepository } from "../../domain/repositories/card.repository"
import { CardEntity } from "../../domain/entities/card.entity"

// ดึง card พร้อมการันตีว่าอยู่ใน board และ org ที่ถูกต้อง (กัน IDOR ข้าม board/tenant)
export async function getCardInBoard(
  cardRepo: CardRepository,
  cardId: string,
  boardId: string,
  organizationId: string
): Promise<CardEntity> {
  const card = await cardRepo.findById(cardId)
  if (
    !card ||
    card.boardId !== boardId ||
    card.organizationId !== organizationId
  ) {
    throw new NotFoundError("Card")
  }
  return card
}
