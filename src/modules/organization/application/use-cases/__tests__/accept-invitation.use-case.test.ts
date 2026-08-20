import { describe, it, expect, vi, beforeEach } from "vitest"
import { AcceptInvitationUseCase } from "../accept-invitation.use-case"
import { AcceptInvitationByIdUseCase } from "../accept-invitation-by-id.use-case"
import { InvitationRepository } from "../../../domain/repositories/invitation.repository"
import { MembershipRepository } from "../../../domain/repositories/membership.repository"
import { InvitationEntity } from "../../../domain/entities/invitation.entity"
import { MembershipEntity } from "../../../domain/entities/membership.entity"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import { UserEntity } from "@modules/auth/domain/entities/user.entities"

// =============================================================
// เทสการรับคำเชิญทั้ง 2 เส้นทาง (token จากลิงก์ / id จากกระดิ่ง)
// กฎสำคัญที่สุด: "email ผู้รับต้องตรงกับคำเชิญ" — ต้องบังคับทั้งสองทาง
// =============================================================

const mockUser: UserEntity = {
  id: "user-1",
  email: "invited@example.com",
  displayName: "Invited User",
  avatarUrl: null,
  role: "USER",
  isEmailVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockMembership: MembershipEntity = {
  id: "mem-1",
  userId: "user-1",
  organizationId: "org-1",
  role: "MEMBER",
  createdAt: new Date(),
  updatedAt: new Date(),
}

// helper สร้างคำเชิญ — override เฉพาะ field ที่เทสสนใจ
function invitation(over: Partial<InvitationEntity> = {}): InvitationEntity {
  return {
    id: "inv-1",
    organizationId: "org-1",
    email: "invited@example.com",
    role: "MEMBER",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // พรุ่งนี้
    createdAt: new Date(),
    ...over,
  }
}

const mockInvitationRepo: InvitationRepository = {
  create: vi.fn(),
  findValidByHash: vi.fn(),
  findById: vi.fn(),
  listPendingByOrg: vi.fn(),
  updateStatus: vi.fn(),
  invalidatePendingForEmail: vi.fn(),
}

const mockMembershipRepo: MembershipRepository = {
  create: vi.fn(),
  findByUserAndOrg: vi.fn(),
  listByOrg: vi.fn(),
  updateRole: vi.fn(),
  remove: vi.fn(),
  countOwners: vi.fn(),
}

const mockUserRepo: UserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findPasswordHashByUserId: vi.fn(),
  create: vi.fn(),
  linkOAuthProvider: vi.fn(),
  markEmailVerified: vi.fn(),
  updatePassword: vi.fn(),
  updateLastSeen: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===================================================================
// AcceptInvitationUseCase — เส้นทาง token (ลิงก์เชิญ)
// ===================================================================
describe("AcceptInvitationUseCase (token path)", () => {
  let useCase: AcceptInvitationUseCase

  beforeEach(() => {
    useCase = new AcceptInvitationUseCase(
      mockInvitationRepo,
      mockMembershipRepo,
      mockUserRepo
    )
  })

  it("should create a membership with the invited role and close the invitation", async () => {
    vi.mocked(mockInvitationRepo.findValidByHash).mockResolvedValue(
      invitation({ role: "ADMIN" })
    )
    vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(null)

    const result = await useCase.execute("user-1", "raw-token")

    expect(mockMembershipRepo.create).toHaveBeenCalledWith({
      userId: "user-1",
      organizationId: "org-1",
      role: "ADMIN", // ต้องได้ role ตามที่ถูกเชิญ ไม่ใช่ default
    })
    expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith(
      "inv-1",
      "ACCEPTED"
    )
    expect(result).toEqual({ organizationId: "org-1", role: "ADMIN" })
  })

  it("should reject an invalid/expired token without touching memberships", async () => {
    // findValidByHash กรอง PENDING + ไม่หมดอายุแล้ว → null ครอบทุกเคสเสีย
    vi.mocked(mockInvitationRepo.findValidByHash).mockResolvedValue(null)

    await expect(useCase.execute("user-1", "bad-token")).rejects.toThrow(
      "Invalid or expired invitation"
    )
    expect(mockMembershipRepo.create).not.toHaveBeenCalled()
  })

  it("should forbid accepting an invitation sent to a different email", async () => {
    // กันส่งต่อลิงก์: บัญชีที่ login ไม่ใช่เจ้าของ email ที่ถูกเชิญ
    vi.mocked(mockInvitationRepo.findValidByHash).mockResolvedValue(
      invitation({ email: "someone-else@example.com" })
    )
    vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

    await expect(useCase.execute("user-1", "raw-token")).rejects.toThrow(
      "different email address"
    )
    expect(mockMembershipRepo.create).not.toHaveBeenCalled()
    // คำเชิญต้องยังใช้ได้อยู่ — เจ้าของ email ตัวจริงยังต้องรับได้
    expect(mockInvitationRepo.updateStatus).not.toHaveBeenCalled()
  })

  it("should close the invitation and throw Conflict when already a member", async () => {
    vi.mocked(mockInvitationRepo.findValidByHash).mockResolvedValue(invitation())
    vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      mockMembership
    )

    await expect(useCase.execute("user-1", "raw-token")).rejects.toThrow(
      "already a member"
    )
    // ปิดคำเชิญทิ้งด้วย — ไม่ปล่อยให้ค้างเป็น PENDING ทั้งที่ใช้ไม่ได้แล้ว
    expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith(
      "inv-1",
      "ACCEPTED"
    )
    expect(mockMembershipRepo.create).not.toHaveBeenCalled()
  })
})

// ===================================================================
// AcceptInvitationByIdUseCase — เส้นทางกระดิ่ง (ไม่มี token)
// ===================================================================
describe("AcceptInvitationByIdUseCase (notification path)", () => {
  let useCase: AcceptInvitationByIdUseCase

  beforeEach(() => {
    useCase = new AcceptInvitationByIdUseCase(
      mockInvitationRepo,
      mockMembershipRepo,
      mockUserRepo
    )
  })

  it("should accept a valid PENDING invitation by id", async () => {
    vi.mocked(mockInvitationRepo.findById).mockResolvedValue(invitation())
    vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(null)

    const result = await useCase.execute("user-1", "inv-1")

    expect(mockMembershipRepo.create).toHaveBeenCalledTimes(1)
    expect(result.organizationId).toBe("org-1")
  })

  it("should reject an unknown invitation id", async () => {
    vi.mocked(mockInvitationRepo.findById).mockResolvedValue(null)

    await expect(useCase.execute("user-1", "ghost-id")).rejects.toThrow(
      "Invalid or expired invitation"
    )
    expect(mockMembershipRepo.create).not.toHaveBeenCalled()
  })

  it("should reject a revoked invitation with the same generic message", async () => {
    // findById ไม่กรองสถานะ → use case ต้องเช็คเอง และห้ามใบ้ว่าโดน revoke
    vi.mocked(mockInvitationRepo.findById).mockResolvedValue(
      invitation({ status: "REVOKED" })
    )

    await expect(useCase.execute("user-1", "inv-1")).rejects.toThrow(
      "Invalid or expired invitation"
    )
    expect(mockMembershipRepo.create).not.toHaveBeenCalled()
  })

  it("should reject an expired invitation even if still PENDING", async () => {
    vi.mocked(mockInvitationRepo.findById).mockResolvedValue(
      invitation({ expiresAt: new Date(Date.now() - 1000) })
    )

    await expect(useCase.execute("user-1", "inv-1")).rejects.toThrow(
      "Invalid or expired invitation"
    )
  })

  it("should enforce the email-match rule on the id path too", async () => {
    // จุดยืนความปลอดภัยของเส้นทางนี้: id ไม่ใช่ความลับ
    // → กฎ email ตรงคือกำแพงจริง ต้องมีเทสล็อกไว้
    vi.mocked(mockInvitationRepo.findById).mockResolvedValue(
      invitation({ email: "someone-else@example.com" })
    )
    vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

    await expect(useCase.execute("user-1", "inv-1")).rejects.toThrow(
      "different email address"
    )
    expect(mockMembershipRepo.create).not.toHaveBeenCalled()
  })
})
