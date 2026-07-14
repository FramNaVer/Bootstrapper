import { describe, it, expect, vi, beforeEach } from "vitest"
import { CreateListUseCase } from "../create-list.use-case"
import { UpdateListUseCase } from "../update-list.use-case"
import { DeleteListUseCase } from "../delete-list.use-case"
import { BoardRepository } from "../../../domain/repositories/board.repository"
import { ListRepository } from "../../../domain/repositories/list.repository"
import { CardRepository } from "../../../domain/repositories/card.repository"
import { ActivityLogRepository } from "../../../domain/repositories/activity-log.repository"
import { BoardEntity } from "../../../domain/entities/board.entity"
import { ListEntity } from "../../../domain/entities/list.entity"

const POSITION_GAP = 1000

const mockBoard: BoardEntity = {
  id: "board-1",
  organizationId: "org-1",
  name: "Board",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockList: ListEntity = {
  id: "list-1",
  organizationId: "org-1",
  boardId: "board-1",
  name: "To Do",
  position: 1000,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockBoardRepo: BoardRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByOrg: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}

const mockListRepo: ListRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByBoard: vi.fn(),
  getMaxPosition: vi.fn(),
  update: vi.fn(),
  updatePositions: vi.fn(),
  softDelete: vi.fn(),
}

const mockCardRepo: CardRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByBoard: vi.fn(),
  getMaxPosition: vi.fn(),
  update: vi.fn(),
  move: vi.fn(),
  listByListOrdered: vi.fn(),
  updatePositions: vi.fn(),
  softDelete: vi.fn(),
  softDeleteByList: vi.fn(),
  listDueInRange: vi.fn(),
}

const mockActivityRepo: ActivityLogRepository = {
  create: vi.fn(),
  listByBoard: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  // default: board ไม่มีคอลัมน์อื่น → เช็ค rebalance หลัง update position เป็น no-op
  vi.mocked(mockListRepo.listByBoard).mockResolvedValue([])
})


// CreateListUseCase — position calculation
describe("CreateListUseCase", () => {
  it("should give the first list position = POSITION_GAP", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue(mockBoard)
    vi.mocked(mockListRepo.getMaxPosition).mockResolvedValue(null) // ยังไม่มี list
    vi.mocked(mockListRepo.create).mockResolvedValue(mockList)
    const useCase = new CreateListUseCase(
      mockBoardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await useCase.execute("org-1", "board-1", "user-1", { name: "To Do" })

    expect(mockListRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ position: POSITION_GAP })
    )
  })

  it("should append after the max position (max + GAP)", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue(mockBoard)
    vi.mocked(mockListRepo.getMaxPosition).mockResolvedValue(2000)
    vi.mocked(mockListRepo.create).mockResolvedValue(mockList)
    const useCase = new CreateListUseCase(
      mockBoardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await useCase.execute("org-1", "board-1", "user-1", { name: "Done" })

    expect(mockListRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ position: 3000 })
    )
  })

  it("should throw NotFound (and not create) when board is cross-tenant", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue({
      ...mockBoard,
      organizationId: "org-2",
    })
    const useCase = new CreateListUseCase(
      mockBoardRepo,
      mockListRepo,
      mockActivityRepo
    )

    await expect(
      useCase.execute("org-1", "board-1", "user-1", { name: "X" })
    ).rejects.toThrow("Board not found")
    expect(mockListRepo.create).not.toHaveBeenCalled()
  })
})

// UpdateListUseCase — getListInBoard guard
describe("UpdateListUseCase", () => {
  it("should update when list belongs to the board+org", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue(mockList)
    vi.mocked(mockListRepo.update).mockResolvedValue({
      ...mockList,
      position: 1500,
    })
    const useCase = new UpdateListUseCase(mockListRepo, mockActivityRepo)

    await useCase.execute("org-1", "board-1", "list-1", "user-1", {
      position: 1500,
    })

    expect(mockListRepo.update).toHaveBeenCalledWith("list-1", {
      position: 1500,
    })
  })

  it("should throw NotFound when list is in a different board", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue({
      ...mockList,
      boardId: "board-999",
    })
    const useCase = new UpdateListUseCase(mockListRepo, mockActivityRepo)

    await expect(
      useCase.execute("org-1", "board-1", "list-1", "user-1", { name: "X" })
    ).rejects.toThrow("List not found")
    expect(mockListRepo.update).not.toHaveBeenCalled()
  })

  it("should throw NotFound when list is cross-tenant", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue({
      ...mockList,
      organizationId: "org-2",
    })
    const useCase = new UpdateListUseCase(mockListRepo, mockActivityRepo)

    await expect(
      useCase.execute("org-1", "board-1", "list-1", "user-1", { name: "X" })
    ).rejects.toThrow("List not found")
  })

  // rebalance คอลัมน์ — กติกาเดียวกับการ์ด (ดู position.util)
  it("should rebalance columns when position gaps collapse", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue(mockList)
    vi.mocked(mockListRepo.update).mockResolvedValue(mockList)
    vi.mocked(mockListRepo.listByBoard).mockResolvedValue([
      { ...mockList, id: "list-a", position: 1000 },
      { ...mockList, id: "list-b", position: 1000 + 1e-9 },
    ])
    const useCase = new UpdateListUseCase(mockListRepo, mockActivityRepo)

    await useCase.execute("org-1", "board-1", "list-1", "user-1", {
      position: 1000 + 1e-9,
    })

    expect(mockListRepo.updatePositions).toHaveBeenCalledWith([
      { id: "list-a", position: 1000 },
      { id: "list-b", position: 2000 },
    ])
  })

  it("should not check rebalance when only renaming", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue(mockList)
    vi.mocked(mockListRepo.update).mockResolvedValue(mockList)
    const useCase = new UpdateListUseCase(mockListRepo, mockActivityRepo)

    await useCase.execute("org-1", "board-1", "list-1", "user-1", {
      name: "Renamed",
    })

    expect(mockListRepo.listByBoard).not.toHaveBeenCalled()
    expect(mockListRepo.updatePositions).not.toHaveBeenCalled()
  })
})


// DeleteListUseCase
describe("DeleteListUseCase", () => {
  it("should soft-delete the list and cascade its cards when valid", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue(mockList)
    const useCase = new DeleteListUseCase(
      mockListRepo,
      mockCardRepo,
      mockActivityRepo
    )

    await useCase.execute("org-1", "board-1", "list-1", "user-1")

    expect(mockCardRepo.softDeleteByList).toHaveBeenCalledWith("list-1")
    expect(mockListRepo.softDelete).toHaveBeenCalledWith("list-1")
    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LIST_DELETED" })
    )
  })

  it("should not delete a list from another board", async () => {
    vi.mocked(mockListRepo.findById).mockResolvedValue({
      ...mockList,
      boardId: "board-999",
    })
    const useCase = new DeleteListUseCase(
      mockListRepo,
      mockCardRepo,
      mockActivityRepo
    )

    await expect(
      useCase.execute("org-1", "board-1", "list-1", "user-1")
    ).rejects.toThrow("List not found")
    expect(mockListRepo.softDelete).not.toHaveBeenCalled()
    expect(mockCardRepo.softDeleteByList).not.toHaveBeenCalled()
  })
})
