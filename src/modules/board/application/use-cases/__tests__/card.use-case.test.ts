import { describe, it, expect, vi, beforeEach } from "vitest"
import { CreateCardUseCase } from "../create-card.use-case"
import { MoveCardUseCase } from "../move-card.use-case"
import { DeleteCardUseCase } from "../delete-card.use-case"
import { CardRepository } from "../../../domain/repositories/card.repository"
import { ListRepository } from "../../../domain/repositories/list.repository"
import { ActivityLogRepository } from "../../../domain/repositories/activity-log.repository"
import { CardEntity } from "../../../domain/entities/card.entity"
import { ListEntity } from "../../../domain/entities/list.entity"

const POSITION_GAP = 1000

const mockList: ListEntity = {
  id: "list-1",
  organizationId: "org-1",
  boardId: "board-1",
  name: "To Do",
  position: 1000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockCard: CardEntity = {
  id: "card-1",
  organizationId: "org-1",
  boardId: "board-1",
  listId: "list-1",
  title: "Task",
  description: null,
  position: 1000,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockCardRepo: CardRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByBoard: vi.fn(),
  getMaxPosition: vi.fn(),
  update: vi.fn(),
  move: vi.fn(),
  softDelete: vi.fn(),
  softDeleteByList: vi.fn(),
  listDueInRange: vi.fn(),
}

const mockListRepo: ListRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByBoard: vi.fn(),
  getMaxPosition: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}

const mockActivityRepo: ActivityLogRepository = {
  create: vi.fn(),
  listByBoard: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})


// CreateCardUseCase — position within list + activity log
describe("CreateCardUseCase", () => {
  const baseParams = {
    organizationId: "org-1",
    boardId: "board-1",
    listId: "list-1",
    actorId: "user-1",
    title: "Task",
  }

  it("should append card after max position in the target list", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue(mockList) // list อยู่ใน board+org
    vi.mocked(mockCardRepo.getMaxPosition).mockResolvedValue(2000)
    vi.mocked(mockCardRepo.create).mockResolvedValue(mockCard)
    const useCase = new CreateCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await useCase.execute(baseParams)

    expect(mockCardRepo.getMaxPosition).toHaveBeenCalledWith("list-1")
    expect(mockCardRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ position: 3000, listId: "list-1" })
    )
  })

  it("should give the first card in a list position = POSITION_GAP", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue(mockList)
    vi.mocked(mockCardRepo.getMaxPosition).mockResolvedValue(null)
    vi.mocked(mockCardRepo.create).mockResolvedValue(mockCard)
    const useCase = new CreateCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await useCase.execute(baseParams)

    expect(mockCardRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ position: POSITION_GAP })
    )
  })

  it("should log a CARD_CREATED activity", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue(mockList)
    vi.mocked(mockCardRepo.getMaxPosition).mockResolvedValue(null)
    vi.mocked(mockCardRepo.create).mockResolvedValue(mockCard)
    const useCase = new CreateCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await useCase.execute(baseParams)

    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: "board-1",
        actorId: "user-1",
        action: "CARD_CREATED",
      })
    )
  })

  it("should throw NotFound (and not create) when target list is cross-board", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue({
      ...mockList,
      boardId: "board-999",
    })
    const useCase = new CreateCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await expect(useCase.execute(baseParams)).rejects.toThrow("List not found")
    expect(mockCardRepo.create).not.toHaveBeenCalled()
    expect(mockActivityRepo.create).not.toHaveBeenCalled()
  })
})

// MoveCardUseCase — double IDOR guard + CARD_MOVED payload
describe("MoveCardUseCase", () => {
  const moveParams = {
    organizationId: "org-1",
    boardId: "board-1",
    cardId: "card-1",
    actorId: "user-1",
    targetListId: "list-2",
    position: 1500,
  }

  it("should move the card to the target list + position", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockListRepo.findById).mockResolvedValue({
      ...mockList,
      id: "list-2",
    })
    vi.mocked(mockCardRepo.move).mockResolvedValue({
      ...mockCard,
      listId: "list-2",
      position: 1500,
    })
    const useCase = new MoveCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await useCase.execute(moveParams)

    expect(mockCardRepo.move).toHaveBeenCalledWith("card-1", {
      listId: "list-2",
      position: 1500,
    })
  })

  it("should log CARD_MOVED with from/to list in payload", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard) // listId เดิม = list-1
    vi.mocked(mockListRepo.findById).mockResolvedValue({
      ...mockList,
      id: "list-2",
    })
    vi.mocked(mockCardRepo.move).mockResolvedValue(mockCard)
    const useCase = new MoveCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await useCase.execute(moveParams)

    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CARD_MOVED",
        payload: { cardId: "card-1", fromListId: "list-1", toListId: "list-2" },
      })
    )
  })

  it("should throw NotFound when the card is cross-tenant (and not move)", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue({
      ...mockCard,
      organizationId: "org-2",
    })
    const useCase = new MoveCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await expect(useCase.execute(moveParams)).rejects.toThrow("Card not found")
    expect(mockCardRepo.move).not.toHaveBeenCalled()
  })

  it("should throw NotFound when the target list is in another board", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockListRepo.findById).mockResolvedValue({
      ...mockList,
      id: "list-2",
      boardId: "board-999",
    })
    const useCase = new MoveCardUseCase(
      mockCardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await expect(useCase.execute(moveParams)).rejects.toThrow("List not found")
    expect(mockCardRepo.move).not.toHaveBeenCalled()
  })
})


// DeleteCardUseCase — soft delete + activity
describe("DeleteCardUseCase", () => {
  it("should soft-delete and log CARD_DELETED", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    const useCase = new DeleteCardUseCase(mockCardRepo, mockActivityRepo)

    await useCase.execute({
      organizationId: "org-1",
      boardId: "board-1",
      cardId: "card-1",
      actorId: "user-1",
    })

    expect(mockCardRepo.softDelete).toHaveBeenCalledWith("card-1")
    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CARD_DELETED" })
    )
  })
})
