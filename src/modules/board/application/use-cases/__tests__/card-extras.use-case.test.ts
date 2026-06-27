import { describe, it, expect, vi, beforeEach } from "vitest"
import { AssignMemberUseCase } from "../assign-member.use-case"
import { DeleteCommentUseCase } from "../delete-comment.use-case"
import { AttachLabelUseCase } from "../attach-label.use-case"
import { CardRepository } from "../../../domain/repositories/card.repository"
import { CardAssigneeRepository } from "../../../domain/repositories/card-assignee.repository"
import { CommentRepository } from "../../../domain/repositories/comment.repository"
import { LabelRepository } from "../../../domain/repositories/label.repository"
import { ActivityLogRepository } from "../../../domain/repositories/activity-log.repository"
import { MembershipRepository } from "@modules/organization/domain/repositories/membership.repository"
import { CardEntity } from "../../../domain/entities/card.entity"
import { CommentEntity } from "../../../domain/entities/comment.entity"
import { LabelEntity } from "../../../domain/entities/label.entity"
import { MembershipEntity } from "@modules/organization/domain/entities/membership.entity"

// --- Mock Data ---
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

const mockMembership: MembershipEntity = {
  id: "mem-1",
  userId: "user-2",
  organizationId: "org-1",
  role: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockComment: CommentEntity = {
  id: "comment-1",
  organizationId: "org-1",
  cardId: "card-1",
  authorId: "user-2",
  body: "hello",
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockLabel: LabelEntity = {
  id: "label-1",
  organizationId: "org-1",
  boardId: "board-1",
  name: "Bug",
  color: "#ff0000",
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
}

const mockMembershipRepo: MembershipRepository = {
  create: vi.fn(),
  findByUserAndOrg: vi.fn(),
  listByOrg: vi.fn(),
  updateRole: vi.fn(),
  remove: vi.fn(),
  countOwners: vi.fn(),
}

const mockAssigneeRepo: CardAssigneeRepository = {
  assign: vi.fn(),
  unassign: vi.fn(),
  exists: vi.fn(),
  listByCard: vi.fn(),
}

const mockCommentRepo: CommentRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByCard: vi.fn(),
  softDelete: vi.fn(),
}

const mockLabelRepo: LabelRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  listByBoard: vi.fn(),
  delete: vi.fn(),
  attachToCard: vi.fn(),
  detachFromCard: vi.fn(),
  isAttached: vi.fn(),
  listByCard: vi.fn(),
}

const mockActivityRepo: ActivityLogRepository = {
  create: vi.fn(),
  listByBoard: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===================================================================
// AssignMemberUseCase — ต้องเป็นสมาชิกจริง + กันมอบหมายซ้ำ
// ===================================================================
describe("AssignMemberUseCase", () => {
  const params = {
    organizationId: "org-1",
    boardId: "board-1",
    cardId: "card-1",
    actorId: "user-1",
    targetUserId: "user-2",
  }

  it("should assign a valid member and log MEMBER_ASSIGNED", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      mockMembership
    )
    vi.mocked(mockAssigneeRepo.exists).mockResolvedValue(false)
    const useCase = new AssignMemberUseCase(
      mockCardRepo,
      mockMembershipRepo,
      mockAssigneeRepo,
      mockActivityRepo
    )

    await useCase.execute(params)

    expect(mockAssigneeRepo.assign).toHaveBeenCalledWith("card-1", "mem-1")
    expect(mockActivityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: "MEMBER_ASSIGNED" })
    )
  })

  it("should throw NotFound when target user is not a member of the org", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(null)
    const useCase = new AssignMemberUseCase(
      mockCardRepo,
      mockMembershipRepo,
      mockAssigneeRepo,
      mockActivityRepo
    )

    await expect(useCase.execute(params)).rejects.toThrow("Member not found")
    expect(mockAssigneeRepo.assign).not.toHaveBeenCalled()
  })

  it("should throw Conflict when member is already assigned", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      mockMembership
    )
    vi.mocked(mockAssigneeRepo.exists).mockResolvedValue(true)
    const useCase = new AssignMemberUseCase(
      mockCardRepo,
      mockMembershipRepo,
      mockAssigneeRepo,
      mockActivityRepo
    )

    await expect(useCase.execute(params)).rejects.toThrow(
      "already assigned"
    )
    expect(mockAssigneeRepo.assign).not.toHaveBeenCalled()
  })
})

// ===================================================================
// DeleteCommentUseCase — เจ้าของ หรือ OWNER/ADMIN เท่านั้น
// ===================================================================
describe("DeleteCommentUseCase", () => {
  it("should let the author delete their own comment", async () => {
    vi.mocked(mockCommentRepo.findById).mockResolvedValue(mockComment)
    const useCase = new DeleteCommentUseCase(mockCommentRepo)

    await useCase.execute({
      organizationId: "org-1",
      cardId: "card-1",
      commentId: "comment-1",
      callerUserId: "user-2", // = authorId
      callerRole: "MEMBER",
    })

    expect(mockCommentRepo.softDelete).toHaveBeenCalledWith("comment-1")
  })

  it("should let an ADMIN delete someone else's comment", async () => {
    vi.mocked(mockCommentRepo.findById).mockResolvedValue(mockComment)
    const useCase = new DeleteCommentUseCase(mockCommentRepo)

    await useCase.execute({
      organizationId: "org-1",
      cardId: "card-1",
      commentId: "comment-1",
      callerUserId: "user-99", // ไม่ใช่เจ้าของ
      callerRole: "ADMIN",
    })

    expect(mockCommentRepo.softDelete).toHaveBeenCalledWith("comment-1")
  })

  it("should forbid a MEMBER from deleting someone else's comment", async () => {
    vi.mocked(mockCommentRepo.findById).mockResolvedValue(mockComment)
    const useCase = new DeleteCommentUseCase(mockCommentRepo)

    await expect(
      useCase.execute({
        organizationId: "org-1",
        cardId: "card-1",
        commentId: "comment-1",
        callerUserId: "user-99",
        callerRole: "MEMBER",
      })
    ).rejects.toThrow("only delete your own comments")
    expect(mockCommentRepo.softDelete).not.toHaveBeenCalled()
  })

  it("should throw NotFound when comment is on a different card", async () => {
    vi.mocked(mockCommentRepo.findById).mockResolvedValue({
      ...mockComment,
      cardId: "card-999",
    })
    const useCase = new DeleteCommentUseCase(mockCommentRepo)

    await expect(
      useCase.execute({
        organizationId: "org-1",
        cardId: "card-1",
        commentId: "comment-1",
        callerUserId: "user-2",
        callerRole: "OWNER",
      })
    ).rejects.toThrow("Comment not found")
  })
})

// ===================================================================
// AttachLabelUseCase — card + label ต้องอยู่ board เดียวกัน + กันติดซ้ำ
// ===================================================================
describe("AttachLabelUseCase", () => {
  const params = {
    organizationId: "org-1",
    boardId: "board-1",
    cardId: "card-1",
    labelId: "label-1",
  }

  it("should attach a label that belongs to the same board", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockLabelRepo.findById).mockResolvedValue(mockLabel)
    vi.mocked(mockLabelRepo.isAttached).mockResolvedValue(false)
    const useCase = new AttachLabelUseCase(mockCardRepo, mockLabelRepo)

    await useCase.execute(params)

    expect(mockLabelRepo.attachToCard).toHaveBeenCalledWith("card-1", "label-1")
  })

  it("should throw NotFound when the label is from another board", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockLabelRepo.findById).mockResolvedValue({
      ...mockLabel,
      boardId: "board-999",
    })
    const useCase = new AttachLabelUseCase(mockCardRepo, mockLabelRepo)

    await expect(useCase.execute(params)).rejects.toThrow("Label not found")
    expect(mockLabelRepo.attachToCard).not.toHaveBeenCalled()
  })

  it("should throw Conflict when the label is already attached", async () => {
    vi.mocked(mockCardRepo.findById).mockResolvedValue(mockCard)
    vi.mocked(mockLabelRepo.findById).mockResolvedValue(mockLabel)
    vi.mocked(mockLabelRepo.isAttached).mockResolvedValue(true)
    const useCase = new AttachLabelUseCase(mockCardRepo, mockLabelRepo)

    await expect(useCase.execute(params)).rejects.toThrow("already attached")
    expect(mockLabelRepo.attachToCard).not.toHaveBeenCalled()
  })
})
