import { describe, it, expect, vi, beforeEach } from "vitest"
import { ListDueCardsUseCase } from "../list-due-cards.use-case"
import { CardRepository } from "../../../domain/repositories/card.repository"
import { CardWithBoard } from "../../../domain/entities/card.entity"

// use case นี้บาง (ส่งต่อให้ repo) — เงื่อนไข filter จริงอยู่ใน Prisma
// จึงล็อกแค่ "ส่ง argument ถูกตัวถูกลำดับ" ที่นี่ ส่วนพฤติกรรม filter
// ล็อกด้วย integration test (org-cards.int.test.ts) ที่ยิง DB จริง
const mockCardRepo: CardRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByBoard: vi.fn(),
  listDueInRange: vi.fn(),
  getMaxPosition: vi.fn(),
  update: vi.fn(),
  move: vi.fn(),
  softDelete: vi.fn(),
  softDeleteByList: vi.fn(),
}

const dueCard: CardWithBoard = {
  id: "card-1",
  organizationId: "org-1",
  boardId: "board-1",
  listId: "list-1",
  title: "ส่งการบ้าน",
  description: null,
  position: 1000,
  dueDate: new Date("2026-07-15"),
  createdAt: new Date(),
  updatedAt: new Date(),
  boardName: "Math",
}

describe("ListDueCardsUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("queries the repo with orgId and the given range, and returns its result", async () => {
    vi.mocked(mockCardRepo.listDueInRange).mockResolvedValue([dueCard])
    const useCase = new ListDueCardsUseCase(mockCardRepo)

    const dueFrom = new Date("2026-07-01")
    const dueTo = new Date("2026-07-31")
    const result = await useCase.execute({
      organizationId: "org-1",
      dueFrom,
      dueTo,
    })

    // ลำดับ argument สำคัญ: (orgId, from, to) — สลับ from/to = ปฏิทินว่างเงียบๆ
    expect(mockCardRepo.listDueInRange).toHaveBeenCalledWith(
      "org-1",
      dueFrom,
      dueTo
    )
    expect(result).toEqual([dueCard])
  })
})
