import { describe, it, expect, vi, beforeEach } from "vitest"
import { CreateBoardUseCase } from "../create-board.use-case"
import { GetBoardUseCase } from "../get-board.use-case"
import { UpdateBoardUseCase } from "../update-board.use-case"
import { DeleteBoardUseCase } from "../delete-board.use-case"
import { BoardRepository } from "../../../domain/repositories/board.repository"
import { BoardEntity } from "../../../domain/entities/board.entity"

// --- Mock Data ---
const mockBoard: BoardEntity = {
  id: "board-1",
  organizationId: "org-1",
  name: "My Board",
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock BoardRepository — แทน Prisma ด้วย vi.fn() เพื่อไม่ต้องต่อ DB จริง
const mockBoardRepo: BoardRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByOrg: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})


// CreateBoardUseCase
describe("CreateBoardUseCase", () => {
  it("should create a board with the given organizationId", async () => {
    vi.mocked(mockBoardRepo.create).mockResolvedValue(mockBoard)
    const useCase = new CreateBoardUseCase(mockBoardRepo)

    const result = await useCase.execute("org-1", { name: "My Board" })

    expect(mockBoardRepo.create).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "My Board",
      description: null, // default เป็น null เมื่อไม่ส่ง description
    })
    expect(result).toEqual(mockBoard)
  })

  it("should pass description through when provided", async () => {
    vi.mocked(mockBoardRepo.create).mockResolvedValue(mockBoard)
    const useCase = new CreateBoardUseCase(mockBoardRepo)

    await useCase.execute("org-1", { name: "My Board", description: "hello" })

    expect(mockBoardRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: "hello" })
    )
  })
})

// GetBoardUseCase — IDOR guard
describe("GetBoardUseCase", () => {
  it("should return the board when it belongs to the org", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue(mockBoard)
    const useCase = new GetBoardUseCase(mockBoardRepo)

    const result = await useCase.execute("org-1", "board-1")

    expect(result).toEqual(mockBoard)
  })

  it("should throw NotFound when board does not exist", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue(null)
    const useCase = new GetBoardUseCase(mockBoardRepo)

    await expect(useCase.execute("org-1", "missing")).rejects.toThrow(
      "Board not found"
    )
  })

  it("should throw NotFound when board belongs to another org (cross-tenant)", async () => {
    // board นี้เป็นของ org-2 แต่ผู้เรียกอยู่ org-1 → ต้องเป็น 404 ไม่ใช่คืน board
    vi.mocked(mockBoardRepo.findById).mockResolvedValue({
      ...mockBoard,
      organizationId: "org-2",
    })
    const useCase = new GetBoardUseCase(mockBoardRepo)

    await expect(useCase.execute("org-1", "board-1")).rejects.toThrow(
      "Board not found"
    )
  })
})


// UpdateBoardUseCase — guard ต้องทำงานก่อน update
describe("UpdateBoardUseCase", () => {
  it("should update when board belongs to the org", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue(mockBoard)
    vi.mocked(mockBoardRepo.update).mockResolvedValue({
      ...mockBoard,
      name: "Renamed",
    })
    const useCase = new UpdateBoardUseCase(mockBoardRepo)

    const result = await useCase.execute("org-1", "board-1", { name: "Renamed" })

    expect(mockBoardRepo.update).toHaveBeenCalledWith("board-1", {
      name: "Renamed",
    })
    expect(result.name).toBe("Renamed")
  })

  it("should NOT update when board is cross-tenant", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue({
      ...mockBoard,
      organizationId: "org-2",
    })
    const useCase = new UpdateBoardUseCase(mockBoardRepo)

    await expect(
      useCase.execute("org-1", "board-1", { name: "Hack" })
    ).rejects.toThrow("Board not found")
    expect(mockBoardRepo.update).not.toHaveBeenCalled()
  })
})


// DeleteBoardUseCase — soft delete + guard
describe("DeleteBoardUseCase", () => {
  it("should soft-delete when board belongs to the org", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue(mockBoard)
    const useCase = new DeleteBoardUseCase(mockBoardRepo)

    await useCase.execute("org-1", "board-1")

    expect(mockBoardRepo.softDelete).toHaveBeenCalledWith("board-1")
  })

  it("should NOT delete when board is cross-tenant", async () => {
    vi.mocked(mockBoardRepo.findById).mockResolvedValue({
      ...mockBoard,
      organizationId: "org-2",
    })
    const useCase = new DeleteBoardUseCase(mockBoardRepo)

    await expect(useCase.execute("org-1", "board-1")).rejects.toThrow(
      "Board not found"
    )
    expect(mockBoardRepo.softDelete).not.toHaveBeenCalled()
  })
})
