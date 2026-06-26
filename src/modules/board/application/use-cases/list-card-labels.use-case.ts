import { CardRepository } from "../../domain/repositories/card.repository"
import { LabelRepository } from "../../domain/repositories/label.repository"
import { getCardInBoard } from "../utils/card-access.util"

// label ที่ "ติดอยู่" บนการ์ดใบหนึ่ง (ผ่าน IDOR guard ของการ์ดก่อน)
export class ListCardLabelsUseCase {
  constructor(
    private cardRepo: CardRepository,
    private labelRepo: LabelRepository
  ) {}

  async execute(organizationId: string, boardId: string, cardId: string) {
    await getCardInBoard(this.cardRepo, cardId, boardId, organizationId)
    return this.labelRepo.listByCard(cardId)
  }
}
