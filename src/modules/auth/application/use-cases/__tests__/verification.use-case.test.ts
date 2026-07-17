import { describe, it, expect, vi, beforeEach } from "vitest"
import { VerifyEmailUseCase } from "../verify-email.use-case"
import { ResetPasswordUseCase } from "../reset-password.use-case"
import { RequestPasswordResetUseCase } from "../request-password-reset.use-case"
import { SendVerificationEmailUseCase } from "../send-verification-email.use-case"
import { UserRepository } from "../../../domain/repositories/user.repository"
import { TokenRepository } from "../../../domain/repositories/token.repository"
import { VerificationTokenRepository } from "../../../domain/repositories/verification-token.repository"
import { EmailService } from "../../ports/email.service"
import { VerificationTokenEntity } from "../../../domain/entities/verification-token.entity"
import { UserEntity } from "../../../domain/entities/user.entities"

const mockUser: UserEntity = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: null,
  role: "USER",
  isEmailVerified: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockTokenRecord: VerificationTokenEntity = {
  id: "vt-1",
  userId: "user-1",
  tokenHash: "hash",
  type: "EMAIL_VERIFICATION",
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  consumedAt: null,
  createdAt: new Date(),
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

const mockVerificationRepo: VerificationTokenRepository = {
  create: vi.fn(),
  findValidByHash: vi.fn(),
  consume: vi.fn(),
  invalidateAllForUser: vi.fn(),
}

const mockTokenRepo: TokenRepository = {
  save: vi.fn(),
  findByToken: vi.fn(),
  revoke: vi.fn(),
  revokeAllForUser: vi.fn(),
}

const mockEmailService: EmailService = {
  sendEmailVerification: vi.fn(),
  sendPasswordReset: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.JWT_SECRET = "test-secret"
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret"
})

// VerifyEmailUseCase
describe("VerifyEmailUseCase", () => {
  it("should mark email verified for a valid token", async () => {
    vi.mocked(mockVerificationRepo.findValidByHash).mockResolvedValue(mockTokenRecord)

    const useCase = new VerifyEmailUseCase(mockUserRepo, mockVerificationRepo)
    await useCase.execute("raw-token")

    expect(mockVerificationRepo.consume).toHaveBeenCalledWith("vt-1")
    expect(mockUserRepo.markEmailVerified).toHaveBeenCalledWith("user-1")
  })

  it("should throw for an invalid or expired token", async () => {
    vi.mocked(mockVerificationRepo.findValidByHash).mockResolvedValue(null)

    const useCase = new VerifyEmailUseCase(mockUserRepo, mockVerificationRepo)
    await expect(useCase.execute("bad-token")).rejects.toThrow(
      "Invalid or expired verification token"
    )
    expect(mockUserRepo.markEmailVerified).not.toHaveBeenCalled()
  })
})

// ResetPasswordUseCase
describe("ResetPasswordUseCase", () => {
  it("should update password, consume token and revoke all sessions", async () => {
    vi.mocked(mockVerificationRepo.findValidByHash).mockResolvedValue({
      ...mockTokenRecord,
      type: "PASSWORD_RESET",
    })

    const useCase = new ResetPasswordUseCase(
      mockUserRepo,
      mockVerificationRepo,
      mockTokenRepo
    )
    await useCase.execute("raw-token", "newPassword123")

    expect(mockUserRepo.updatePassword).toHaveBeenCalledTimes(1)
    expect(mockVerificationRepo.consume).toHaveBeenCalledWith("vt-1")
    // ต้อง revoke ทุก session เก่าหลังเปลี่ยนรหัส
    expect(mockTokenRepo.revokeAllForUser).toHaveBeenCalledWith("user-1")
  })

  it("should throw for an invalid token and not touch the password", async () => {
    vi.mocked(mockVerificationRepo.findValidByHash).mockResolvedValue(null)

    const useCase = new ResetPasswordUseCase(
      mockUserRepo,
      mockVerificationRepo,
      mockTokenRepo
    )
    await expect(useCase.execute("bad-token", "newPassword123")).rejects.toThrow(
      "Invalid or expired reset token"
    )
    expect(mockUserRepo.updatePassword).not.toHaveBeenCalled()
  })
})

// RequestPasswordResetUseCase
describe("RequestPasswordResetUseCase", () => {
  it("should send a reset email for an existing active user", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser)

    const useCase = new RequestPasswordResetUseCase(
      mockUserRepo,
      mockVerificationRepo,
      mockEmailService
    )
    await useCase.execute("test@example.com")

    expect(mockVerificationRepo.create).toHaveBeenCalledTimes(1)
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledTimes(1)
  })

  it("should silently do nothing for a non-existent email (no enumeration)", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)

    const useCase = new RequestPasswordResetUseCase(
      mockUserRepo,
      mockVerificationRepo,
      mockEmailService
    )
    await expect(useCase.execute("ghost@example.com")).resolves.toBeUndefined()

    expect(mockVerificationRepo.create).not.toHaveBeenCalled()
    expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled()
  })
})


// SendVerificationEmailUseCase
describe("SendVerificationEmailUseCase", () => {
  it("should invalidate old tokens, create a new one and send the email", async () => {
    const useCase = new SendVerificationEmailUseCase(
      mockVerificationRepo,
      mockEmailService
    )
    await useCase.execute("user-1", "test@example.com")

    expect(mockVerificationRepo.invalidateAllForUser).toHaveBeenCalledWith(
      "user-1",
      "EMAIL_VERIFICATION"
    )
    expect(mockVerificationRepo.create).toHaveBeenCalledTimes(1)
    expect(mockEmailService.sendEmailVerification).toHaveBeenCalledTimes(1)
  })
})
