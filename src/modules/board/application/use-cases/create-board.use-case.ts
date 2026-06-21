import { BoardRepository } from "../../domain/repositories/board.repository"

export class CreateBoardUseCase {
  constructor(private boardRepo: BoardRepository) {}

  // organizationId มาจาก :orgId ที่ RBAC ยืนยันแล้วว่าผู้เรียกเป็นสมาชิก
  async execute(
    organizationId: string,
    data: { name: string; description?: string | null }
  ) {
    return this.boardRepo.create({
      organizationId,
      name: data.name,
      description: data.description ?? null,
    })
  }
}
