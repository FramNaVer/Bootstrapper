import { describe, it, expect, vi, beforeEach } from "vitest"
import { SendMessageUseCase } from "../send-message.use-case"
import { ListMessagesUseCase } from "../list-messages.use-case"
import { MessageRepository } from "../../../domain/repositories/message.repository"
import { MessageWithAuthor } from "../../../domain/entities/message.entity"

const mockMessageRepo: MessageRepository = {
  create: vi.fn(),
  listByOrg: vi.fn(),
}

function makeMessage(id: string): MessageWithAuthor {
  return {
    id,
    organizationId: "org-1",
    authorId: "user-1",
    body: `ข้อความ ${id}`,
    createdAt: new Date(),
    authorName: "ครูเอ",
    authorEmail: "a@test.local",
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("SendMessageUseCase", () => {
  it("creates the message and returns it with author info", async () => {
    const msg = makeMessage("m-1")
    vi.mocked(mockMessageRepo.create).mockResolvedValue(msg)
    const useCase = new SendMessageUseCase(mockMessageRepo)

    const result = await useCase.execute({
      organizationId: "org-1",
      authorId: "user-1",
      body: "สวัสดี",
    })

    expect(mockMessageRepo.create).toHaveBeenCalledWith({
      organizationId: "org-1",
      authorId: "user-1",
      body: "สวัสดี",
    })
    expect(result).toEqual(msg)
  })
})

describe("ListMessagesUseCase (cursor pagination)", () => {
  // หัวใจของ logic "ขอเกิน 1": repo ต้องถูกขอ limit+1 เสมอ
  it("requests limit+1 rows from the repo and forwards the cursor", async () => {
    vi.mocked(mockMessageRepo.listByOrg).mockResolvedValue([])
    const useCase = new ListMessagesUseCase(mockMessageRepo)

    await useCase.execute({ organizationId: "org-1", limit: 50, cursor: "m-9" })

    expect(mockMessageRepo.listByOrg).toHaveBeenCalledWith("org-1", 51, "m-9")
  })

  it("returns nextCursor when a full page + 1 exists (more pages remain)", async () => {
    // limit 2 → repo คืน 3 แถว = มีหน้าถัดไป
    const rows = [makeMessage("m-3"), makeMessage("m-2"), makeMessage("m-1")]
    vi.mocked(mockMessageRepo.listByOrg).mockResolvedValue(rows)
    const useCase = new ListMessagesUseCase(mockMessageRepo)

    const result = await useCase.execute({ organizationId: "org-1", limit: 2 })

    // ตัดตัวเกินทิ้ง เหลือ 2 และ cursor คือ id ตัวสุดท้ายที่ "ส่งจริง" (ไม่ใช่ตัวเกิน)
    expect(result.messages.map((m) => m.id)).toEqual(["m-3", "m-2"])
    expect(result.nextCursor).toBe("m-2")
  })

  it("returns nextCursor: null when rows fit exactly in the limit (last page)", async () => {
    // limit 2 → repo คืน 2 แถว (ขอ 3 ได้ 2) = หมดพอดี ต้องไม่โกหกว่ามีต่อ
    const rows = [makeMessage("m-2"), makeMessage("m-1")]
    vi.mocked(mockMessageRepo.listByOrg).mockResolvedValue(rows)
    const useCase = new ListMessagesUseCase(mockMessageRepo)

    const result = await useCase.execute({ organizationId: "org-1", limit: 2 })

    expect(result.messages).toHaveLength(2)
    expect(result.nextCursor).toBeNull()
  })

  it("returns an empty page with nextCursor: null when there are no messages", async () => {
    vi.mocked(mockMessageRepo.listByOrg).mockResolvedValue([])
    const useCase = new ListMessagesUseCase(mockMessageRepo)

    const result = await useCase.execute({ organizationId: "org-1", limit: 50 })

    expect(result.messages).toEqual([])
    expect(result.nextCursor).toBeNull()
  })
})
