import { describe, it, expect, vi, beforeEach } from "vitest"
import bcrypt from "bcrypt"
import { LoginUseCase } from "../login.use-case"
import { RefreshTokenUseCase } from "../refresh-token.use-case"
import { LogoutUseCase } from "../logout.use-case"
import { generateRefreshToken } from "../../utils/jwt.util"
import { UserRepository } from "../../../domain/repositories/user.repository"
import { TokenRepository } from "../../../domain/repositories/token.repository"
import { RefreshTokenEntity } from "../../../domain/entities/token.entity"
import { UserEntity } from "../../../domain/entities/user.entities"

// =============================================================
// เทสวงจร session: login → refresh (rotation + reuse detection) → logout
// นี่คือ logic ที่ sensitive ที่สุดของระบบ — ถ้าพังคือช่องโหว่ ไม่ใช่แค่บั๊ก
// =============================================================

const mockUser: UserEntity = {
  id: "user-1",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: null,
  role: "USER",
  isEmailVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// hash จริงของ "password123" — ใช้ rounds 4 ให้เทสเร็ว
// (bcrypt ฝัง cost ไว้ใน hash เอง → compare ทำงานได้ไม่ว่า cost เท่าไร)
const passwordHash = bcrypt.hashSync("password123", 4)

const mockUserRepo: UserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findPasswordHashByUserId: vi.fn(),
  create: vi.fn(),
  linkOAuthProvider: vi.fn(),
  markEmailVerified: vi.fn(),
  updatePassword: vi.fn(),
}

const mockTokenRepo: TokenRepository = {
  save: vi.fn(),
  findByToken: vi.fn(),
  revoke: vi.fn(),
  revokeAllForUser: vi.fn(),
}

// helper สร้าง record ของ refresh token ใน DB — override เฉพาะ field ที่เทสสนใจ
function tokenRecord(over: Partial<RefreshTokenEntity> = {}): RefreshTokenEntity {
  return {
    id: "rt-1",
    userId: "user-1",
    token: "stored-hash",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // พรุ่งนี้
    isRevoked: false,
    createdAt: new Date(),
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===================================================================
// LoginUseCase
// ===================================================================
describe("LoginUseCase", () => {
  let useCase: LoginUseCase

  beforeEach(() => {
    useCase = new LoginUseCase(mockUserRepo, mockTokenRepo)
  })

  it("should return token pair + user and persist the refresh token", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser)
    vi.mocked(mockUserRepo.findPasswordHashByUserId).mockResolvedValue(passwordHash)

    const result = await useCase.execute({
      email: "test@example.com",
      password: "password123",
    })

    expect(result.accessToken).toBeDefined()
    expect(result.refreshToken).toBeDefined()
    expect(result.user).toEqual(mockUser)
    // refresh token ต้องถูกบันทึกลง DB เพื่อให้ revoke ได้ภายหลัง
    expect(mockTokenRepo.save).toHaveBeenCalledWith(
      "user-1",
      result.refreshToken,
      expect.any(Date)
    )
  })

  // 4 เคสล้มเหลวต้องได้ "ข้อความเดียวกันทุกเคส" — กัน user enumeration
  // (ถ้าข้อความต่างกัน ผู้โจมตีแยกได้ว่า email ไหนมีอยู่ในระบบ)
  const GENERIC_ERROR = "Invalid email or password"

  it("should reject unknown email with the generic message", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)

    await expect(
      useCase.execute({ email: "ghost@example.com", password: "password123" })
    ).rejects.toThrow(GENERIC_ERROR)
    expect(mockTokenRepo.save).not.toHaveBeenCalled()
  })

  it("should reject a deactivated user with the generic message", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue({
      ...mockUser,
      isActive: false,
    })

    await expect(
      useCase.execute({ email: "test@example.com", password: "password123" })
    ).rejects.toThrow(GENERIC_ERROR)
  })

  it("should reject an OAuth-only account (no password hash) with the generic message", async () => {
    // คนสมัครผ่าน Google/GitHub ไม่มีแถว UserPassword — login ด้วยรหัสต้องไม่ผ่าน
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser)
    vi.mocked(mockUserRepo.findPasswordHashByUserId).mockResolvedValue(null)

    await expect(
      useCase.execute({ email: "test@example.com", password: "password123" })
    ).rejects.toThrow(GENERIC_ERROR)
  })

  it("should reject a wrong password with the generic message and not save any token", async () => {
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser)
    vi.mocked(mockUserRepo.findPasswordHashByUserId).mockResolvedValue(passwordHash)

    await expect(
      useCase.execute({ email: "test@example.com", password: "wrong-password" })
    ).rejects.toThrow(GENERIC_ERROR)
    expect(mockTokenRepo.save).not.toHaveBeenCalled()
  })
})

// ===================================================================
// RefreshTokenUseCase — rotation + reuse detection
// ===================================================================
describe("RefreshTokenUseCase", () => {
  let useCase: RefreshTokenUseCase
  let validRefresh: string

  beforeEach(() => {
    useCase = new RefreshTokenUseCase(mockTokenRepo)
    // JWT จริงที่ verify ผ่าน (เซ็นด้วย secret ของ vitest.config)
    validRefresh = generateRefreshToken("user-1")
  })

  it("should rotate: revoke the old token, save and return a new pair", async () => {
    vi.mocked(mockTokenRepo.findByToken).mockResolvedValue(tokenRecord())

    const result = await useCase.execute(validRefresh)

    // token เก่าต้องตายทันทีที่ออกตัวใหม่ (rotation)
    expect(mockTokenRepo.revoke).toHaveBeenCalledWith(validRefresh)
    expect(mockTokenRepo.save).toHaveBeenCalledWith(
      "user-1",
      result.refreshToken,
      expect.any(Date)
    )
    expect(result.accessToken).toBeDefined()
    // ตัวใหม่ต้องไม่ใช่ตัวเดิม (มี jti สุ่มใน payload)
    expect(result.refreshToken).not.toBe(validRefresh)
  })

  it("should reject a malformed/forged token before touching the DB", async () => {
    await expect(useCase.execute("not-a-jwt")).rejects.toThrow(
      "Invalid or expired refresh token"
    )
    // JWT verify ไม่ผ่าน → ต้องไม่ query DB เลย
    expect(mockTokenRepo.findByToken).not.toHaveBeenCalled()
  })

  it("should reject a valid JWT that has no record in the DB", async () => {
    // เคส token ถูกลบจาก DB แล้ว (เช่นโดน purge) แต่ JWT ยังไม่หมดอายุ
    vi.mocked(mockTokenRepo.findByToken).mockResolvedValue(null)

    await expect(useCase.execute(validRefresh)).rejects.toThrow(
      "Invalid or expired refresh token"
    )
    expect(mockTokenRepo.save).not.toHaveBeenCalled()
  })

  it("REUSE DETECTION: should revoke ALL sessions when a revoked token is replayed", async () => {
    // สถานการณ์: token ถูก rotate ไปแล้ว (revoked) แต่มีคนเอามาใช้ซ้ำ
    // = สัญญาณว่า token หลุดไปอยู่ในมือคนอื่น → ฆ่าทุก session ของ user ทันที
    vi.mocked(mockTokenRepo.findByToken).mockResolvedValue(
      tokenRecord({ isRevoked: true })
    )

    await expect(useCase.execute(validRefresh)).rejects.toThrow(
      "Refresh token has been revoked"
    )
    expect(mockTokenRepo.revokeAllForUser).toHaveBeenCalledWith("user-1")
    // ต้องไม่ออก token ใหม่ให้เด็ดขาด
    expect(mockTokenRepo.save).not.toHaveBeenCalled()
  })

  it("should reject when the DB record is expired (even if the JWT is not)", async () => {
    vi.mocked(mockTokenRepo.findByToken).mockResolvedValue(
      tokenRecord({ expiresAt: new Date(Date.now() - 1000) })
    )

    await expect(useCase.execute(validRefresh)).rejects.toThrow(
      "Refresh token has expired"
    )
    expect(mockTokenRepo.save).not.toHaveBeenCalled()
  })
})

// ===================================================================
// LogoutUseCase — ต้อง "สำเร็จเสมอ" ไม่ว่า token จะอยู่สถานะไหน
// ===================================================================
describe("LogoutUseCase", () => {
  let useCase: LogoutUseCase

  beforeEach(() => {
    useCase = new LogoutUseCase(mockTokenRepo)
  })

  it("should revoke a valid refresh token", async () => {
    const validRefresh = generateRefreshToken("user-1")

    await useCase.execute(validRefresh)

    expect(mockTokenRepo.revoke).toHaveBeenCalledWith(validRefresh)
  })

  it("should resolve silently for an invalid token (already logged out)", async () => {
    await expect(useCase.execute("garbage-token")).resolves.toBeUndefined()
    expect(mockTokenRepo.revoke).not.toHaveBeenCalled()
  })

  it("should resolve silently even when the repo throws (token not in DB)", async () => {
    // เช่น token ถูก rotate/ลบไปแล้ว → prisma update โยน error
    // logout ต้องไม่ล้ม เพราะผลลัพธ์ที่ user ต้องการ (ออกจากระบบ) เกิดขึ้นแล้ว
    const validRefresh = generateRefreshToken("user-1")
    vi.mocked(mockTokenRepo.revoke).mockRejectedValue(new Error("not found"))

    await expect(useCase.execute(validRefresh)).resolves.toBeUndefined()
  })
})
