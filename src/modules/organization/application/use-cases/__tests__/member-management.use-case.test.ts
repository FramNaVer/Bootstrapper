import { describe, it, expect, vi, beforeEach } from "vitest"
import { ChangeMemberRoleUseCase } from "../change-member-role.use-case"
import { RemoveMemberUseCase } from "../remove-member.use-case"
import { InviteMemberUseCase } from "../invite-member.use-case"
import { CreateOrganizationUseCase } from "../create-organization.use-case"
import { MembershipRepository } from "../../../domain/repositories/membership.repository"
import { OrganizationRepository } from "../../../domain/repositories/organization.repository"
import { InvitationRepository } from "../../../domain/repositories/invitation.repository"
import { InvitationEmailService } from "../../ports/invitation-email.service"
import { MembershipEntity, MembershipRole } from "../../../domain/entities/membership.entity"
import { OrganizationEntity } from "../../../domain/entities/organization.entity"
import { InvitationEntity } from "../../../domain/entities/invitation.entity"
import { UserRepository } from "@modules/auth/domain/repositories/user.repository"
import { UserEntity } from "@modules/auth/domain/entities/user.entities"
import { NotificationRepository } from "@modules/notification/domain/repositories/notification.repository"

// =============================================================
// เทสกฎการจัดการสมาชิก — business rules ที่สำคัญที่สุดของ org module:
//   1) creator protection: ผู้ก่อตั้งถูกใครลด role / เตะออกไม่ได้ นอกจากตัวเอง
//   2) last-owner protection: org ต้องมี OWNER อย่างน้อย 1 คนเสมอ
//   3) เฉพาะ OWNER เท่านั้นที่จัดการ/แต่งตั้ง OWNER ได้
// กฎพวกนี้เคยเทสมือผ่านแล้ว — เทสชุดนี้ล็อกไว้กัน refactor ทำกฎหายเงียบๆ
// =============================================================

// ตัวละคร: creator-1 = ผู้ก่อตั้ง (OWNER), owner-2 = OWNER อีกคน,
//          admin-3 = ADMIN, member-4 = MEMBER
const ORG_ID = "org-1"

const mockOrg: OrganizationEntity = {
  id: ORG_ID,
  name: "Test Org",
  slug: "test-org",
  createdById: "creator-1",
  createdAt: new Date(),
  updatedAt: new Date(),
}

function membership(
  userId: string,
  role: MembershipRole,
  over: Partial<MembershipEntity> = {}
): MembershipEntity {
  return {
    id: `mem-${userId}`,
    userId,
    organizationId: ORG_ID,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }
}

const mockMembershipRepo: MembershipRepository = {
  create: vi.fn(),
  findByUserAndOrg: vi.fn(),
  listByOrg: vi.fn(),
  updateRole: vi.fn(),
  remove: vi.fn(),
  countOwners: vi.fn(),
}

const mockOrgRepo: OrganizationRepository = {
  findById: vi.fn(),
  findBySlug: vi.fn(),
  createWithOwner: vi.fn(),
  listByUserId: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  // ค่าเริ่มต้นของทุกเทส: org นี้มีผู้ก่อตั้งคือ creator-1
  vi.mocked(mockOrgRepo.findById).mockResolvedValue(mockOrg)
})

// ===================================================================
// ChangeMemberRoleUseCase
// ===================================================================
describe("ChangeMemberRoleUseCase", () => {
  let useCase: ChangeMemberRoleUseCase

  beforeEach(() => {
    useCase = new ChangeMemberRoleUseCase(mockMembershipRepo, mockOrgRepo)
  })

  it("should let an OWNER promote a MEMBER to ADMIN", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("member-4", "MEMBER")
    )

    await useCase.execute({
      organizationId: ORG_ID,
      callerUserId: "owner-2",
      callerRole: "OWNER",
      targetUserId: "member-4",
      newRole: "ADMIN",
    })

    expect(mockMembershipRepo.updateRole).toHaveBeenCalledWith(
      "mem-member-4",
      "ADMIN"
    )
  })

  it("should throw NotFound when the target is not a member", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(null)

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "owner-2",
        callerRole: "OWNER",
        targetUserId: "ghost",
        newRole: "ADMIN",
      })
    ).rejects.toThrow("Member not found")
  })

  it("CREATOR PROTECTION: even another OWNER cannot change the creator's role", async () => {
    // เคสที่เจอเองตอนเทสมือ: เชิญ owner-2 เป็น OWNER แล้ว owner-2
    // พยายามลดผู้ก่อตั้งเหลือ MEMBER — ต้องโดนบล็อก
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("creator-1", "OWNER")
    )

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "owner-2",
        callerRole: "OWNER",
        targetUserId: "creator-1",
        newRole: "MEMBER",
      })
    ).rejects.toThrow("creator cannot be changed")
    expect(mockMembershipRepo.updateRole).not.toHaveBeenCalled()
  })

  it("should let the creator change their own role (guard applies to others only)", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("creator-1", "OWNER")
    )
    vi.mocked(mockMembershipRepo.countOwners).mockResolvedValue(2) // มี owner สำรอง

    await useCase.execute({
      organizationId: ORG_ID,
      callerUserId: "creator-1", // ตัวเองเป็นคนสั่ง
      callerRole: "OWNER",
      targetUserId: "creator-1",
      newRole: "ADMIN",
    })

    expect(mockMembershipRepo.updateRole).toHaveBeenCalledWith(
      "mem-creator-1",
      "ADMIN"
    )
  })

  it("should forbid an ADMIN from touching an OWNER", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("owner-2", "OWNER")
    )

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "admin-3",
        callerRole: "ADMIN",
        targetUserId: "owner-2",
        newRole: "MEMBER",
      })
    ).rejects.toThrow("Only an owner can manage owners")
  })

  it("should forbid an ADMIN from promoting anyone to OWNER", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("member-4", "MEMBER")
    )

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "admin-3",
        callerRole: "ADMIN",
        targetUserId: "member-4",
        newRole: "OWNER",
      })
    ).rejects.toThrow("Only an owner can manage owners")
  })

  it("LAST-OWNER PROTECTION: cannot demote the only remaining owner", async () => {
    // creator ลดขั้นตัวเอง แต่เป็น OWNER คนเดียว → org จะไร้เจ้าของ
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("creator-1", "OWNER")
    )
    vi.mocked(mockMembershipRepo.countOwners).mockResolvedValue(1)

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "creator-1",
        callerRole: "OWNER",
        targetUserId: "creator-1",
        newRole: "MEMBER",
      })
    ).rejects.toThrow("at least one owner")
    expect(mockMembershipRepo.updateRole).not.toHaveBeenCalled()
  })
})

// ===================================================================
// RemoveMemberUseCase
// ===================================================================
describe("RemoveMemberUseCase", () => {
  let useCase: RemoveMemberUseCase

  beforeEach(() => {
    useCase = new RemoveMemberUseCase(mockMembershipRepo, mockOrgRepo)
  })

  it("should let an OWNER remove a MEMBER", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("member-4", "MEMBER")
    )

    await useCase.execute({
      organizationId: ORG_ID,
      callerUserId: "owner-2",
      callerRole: "OWNER",
      targetUserId: "member-4",
    })

    expect(mockMembershipRepo.remove).toHaveBeenCalledWith("mem-member-4")
  })

  it("CREATOR PROTECTION: even another OWNER cannot remove the creator", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("creator-1", "OWNER")
    )

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "owner-2",
        callerRole: "OWNER",
        targetUserId: "creator-1",
      })
    ).rejects.toThrow("creator cannot be removed")
    expect(mockMembershipRepo.remove).not.toHaveBeenCalled()
  })

  it("should forbid an ADMIN from removing an OWNER", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("owner-2", "OWNER")
    )

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "admin-3",
        callerRole: "ADMIN",
        targetUserId: "owner-2",
      })
    ).rejects.toThrow("Only an owner can remove an owner")
  })

  it("LAST-OWNER PROTECTION: cannot remove the only remaining owner", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("creator-1", "OWNER")
    )
    vi.mocked(mockMembershipRepo.countOwners).mockResolvedValue(1)

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        callerUserId: "creator-1", // แม้แต่ตัวเอง (ออกเอง) ก็ไม่ได้ถ้าเป็นคนสุดท้าย
        callerRole: "OWNER",
        targetUserId: "creator-1",
      })
    ).rejects.toThrow("last owner")
    expect(mockMembershipRepo.remove).not.toHaveBeenCalled()
  })

  it("should allow removing an OWNER when another owner remains", async () => {
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("owner-2", "OWNER")
    )
    vi.mocked(mockMembershipRepo.countOwners).mockResolvedValue(2)

    await useCase.execute({
      organizationId: ORG_ID,
      callerUserId: "creator-1",
      callerRole: "OWNER",
      targetUserId: "owner-2",
    })

    expect(mockMembershipRepo.remove).toHaveBeenCalledWith("mem-owner-2")
  })
})

// ===================================================================
// InviteMemberUseCase — กฎการเชิญ + property ความปลอดภัยของ token
// ===================================================================
describe("InviteMemberUseCase", () => {
  const mockInvitationRepo: InvitationRepository = {
    create: vi.fn(),
    findValidByHash: vi.fn(),
    findById: vi.fn(),
    listPendingByOrg: vi.fn(),
    updateStatus: vi.fn(),
    invalidatePendingForEmail: vi.fn(),
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

  const mockInvitationEmail: InvitationEmailService = {
    sendInvite: vi.fn(),
  }

  const mockNotificationRepo: NotificationRepository = {
    create: vi.fn(),
    listByUser: vi.fn(),
    countUnread: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  }

  const createdInvitation: InvitationEntity = {
    id: "inv-1",
    organizationId: ORG_ID,
    email: "invitee@example.com",
    role: "MEMBER",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  }

  const existingUser: UserEntity = {
    id: "user-9",
    email: "invitee@example.com",
    displayName: "Invitee",
    avatarUrl: null,
    role: "USER",
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  let useCase: InviteMemberUseCase

  beforeEach(() => {
    useCase = new InviteMemberUseCase(
      mockInvitationRepo,
      mockMembershipRepo,
      mockUserRepo,
      mockInvitationEmail,
      mockOrgRepo,
      mockNotificationRepo
    )
    vi.mocked(mockInvitationRepo.create).mockResolvedValue(createdInvitation)
  })

  it("should forbid a non-OWNER from inviting an OWNER", async () => {
    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        inviterRole: "ADMIN",
        email: "invitee@example.com",
        role: "OWNER",
      })
    ).rejects.toThrow("Only an owner can invite owners")
    expect(mockInvitationRepo.create).not.toHaveBeenCalled()
  })

  it("should throw Conflict when the email already belongs to a member", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(existingUser)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(
      membership("user-9", "MEMBER")
    )

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        inviterRole: "OWNER",
        email: "invitee@example.com",
        role: "MEMBER",
      })
    ).rejects.toThrow("already a member")
    expect(mockInvitationRepo.create).not.toHaveBeenCalled()
  })

  it("should store only the HASH of the token, never the raw token", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)

    const result = await useCase.execute({
      organizationId: ORG_ID,
      inviterRole: "OWNER",
      email: "new@example.com",
      role: "MEMBER",
    })

    // raw token อยู่ท้าย acceptUrl — ค่าที่เก็บลง DB ต้อง "ไม่ใช่" ตัวเดียวกัน
    const rawToken = result.acceptUrl.split("token=")[1]
    const createArg = vi.mocked(mockInvitationRepo.create).mock.calls[0][0]
    expect(rawToken).toBeTruthy()
    expect(createArg.tokenHash).toBeTruthy()
    expect(createArg.tokenHash).not.toBe(rawToken)
    // คำเชิญเดิมของ email นี้ต้องถูกยกเลิกก่อน (ใช้ได้ทีละใบ)
    expect(mockInvitationRepo.invalidatePendingForEmail).toHaveBeenCalledWith(
      ORG_ID,
      "new@example.com"
    )
    expect(mockInvitationEmail.sendInvite).toHaveBeenCalledWith(
      "new@example.com",
      result.acceptUrl
    )
  })

  it("should NOT create a notification when the invitee has no account yet", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)

    const result = await useCase.execute({
      organizationId: ORG_ID,
      inviterRole: "OWNER",
      email: "new@example.com",
      role: "MEMBER",
    })

    expect(mockNotificationRepo.create).not.toHaveBeenCalled()
    expect(result.notifyUserId).toBeNull()
  })

  it("should notify an existing user with invitationId in the payload — never the raw token", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(existingUser)
    vi.mocked(mockMembershipRepo.findByUserAndOrg).mockResolvedValue(null)

    const result = await useCase.execute({
      organizationId: ORG_ID,
      inviterRole: "OWNER",
      email: "invitee@example.com",
      role: "MEMBER",
    })

    expect(result.notifyUserId).toBe("user-9")
    const notiArg = vi.mocked(mockNotificationRepo.create).mock.calls[0][0]
    expect(notiArg.userId).toBe("user-9")
    expect(notiArg.type).toBe("ORG_INVITE")
    const payload = notiArg.payload as Record<string, unknown>
    expect(payload.invitationId).toBe("inv-1")
    // property ความปลอดภัยที่เราแก้ไป: payload ต้องไม่พก raw token ลง DB
    expect(payload.token).toBeUndefined()
  })
})

// ===================================================================
// CreateOrganizationUseCase — ผู้สร้างต้องกลายเป็น OWNER + slug ไม่ซ้ำ
// ===================================================================
describe("CreateOrganizationUseCase", () => {
  let useCase: CreateOrganizationUseCase

  beforeEach(() => {
    useCase = new CreateOrganizationUseCase(mockOrgRepo)
    vi.mocked(mockOrgRepo.createWithOwner).mockResolvedValue(mockOrg)
  })

  it("should create with the caller as owner and a slugified name", async () => {
    vi.mocked(mockOrgRepo.findBySlug).mockResolvedValue(null)

    await useCase.execute("creator-1", "My Classroom")

    expect(mockOrgRepo.createWithOwner).toHaveBeenCalledWith({
      name: "My Classroom",
      slug: "my-classroom",
      ownerUserId: "creator-1",
    })
  })

  it("should append a random suffix when the slug already exists", async () => {
    // ครั้งแรกชน (มี org ใช้ slug นี้แล้ว) → ครั้งสองว่าง
    vi.mocked(mockOrgRepo.findBySlug)
      .mockResolvedValueOnce(mockOrg)
      .mockResolvedValueOnce(null)

    await useCase.execute("creator-1", "My Classroom")

    const arg = vi.mocked(mockOrgRepo.createWithOwner).mock.calls[0][0]
    expect(arg.slug).toMatch(/^my-classroom-.+/)
  })
})
