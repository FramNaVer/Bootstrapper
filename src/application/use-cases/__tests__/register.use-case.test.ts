import { describe, it, expect, vi, beforeEach } from "vitest"
import { RegisterUseCase } from "../register.use-case"
import { GoogleLoginUseCase } from "../google-login.use-case"
import { GithubLoginUseCase } from "../github-login.use-case"
import { UserRepository } from "../../../domain/repositories/user.repository"
import { TokenRepository } from "../../../domain/repositories/token.repository"
import { UserEntity } from "../../../domain/entities/user.entities"

// --- Mock Data ---

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

// Mock UserRepository — แทน Prisma ด้วย vi.fn() เพื่อให้ test ไม่ต้องต่อ DB จริง
const mockUserRepo: UserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findPasswordHashByUserId: vi.fn(),
    create: vi.fn(),
    linkOAuthProvider: vi.fn(),
}

// Mock TokenRepository — แทน Prisma สำหรับ use cases ที่ต้องการ token repo
const mockTokenRepo: TokenRepository = {
    save: vi.fn(),
    findByToken: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
}

// ===================================================================
// RegisterUseCase
// ===================================================================
describe("RegisterUseCase", () => {
    let registerUseCase: RegisterUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        registerUseCase = new RegisterUseCase(mockUserRepo)
    })

    // ทดสอบกรณีที่ผู้ใช้ลงทะเบียนสำเร็จ
    it("should register a new user successfully", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)
        vi.mocked(mockUserRepo.create).mockResolvedValue(mockUser)

        const result = await registerUseCase.execute({
            email: "test@example.com",
            password: "password123",
            displayName: "Test User",
        })

        expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("test@example.com")
        expect(mockUserRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "test@example.com",
                displayName: "Test User",
                passwordHash: expect.any(String),
            })
        )
        expect(result).toEqual(mockUser)
    })

    // ทดสอบกรณีที่ผู้ใช้พยายามลงทะเบียนด้วยอีเมลที่มีอยู่แล้วในระบบ
    it("should throw ConflictError if email is already registered", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser)

        await expect(
            registerUseCase.execute({
                email: "test@example.com",
                password: "password123",
            })
        ).rejects.toThrow("Email is already registered")

        expect(mockUserRepo.create).not.toHaveBeenCalled()
    })

    // ทดสอบว่า password ถูก hash ก่อนที่จะถูกบันทึกลงในฐานข้อมูล
    it("should hash the password before saving", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)
        vi.mocked(mockUserRepo.create).mockResolvedValue(mockUser)

        await registerUseCase.execute({
            email: "test@example.com",
            password: "plaintext123",
        })

        const createCall = vi.mocked(mockUserRepo.create).mock.calls[0][0]
        expect(createCall.passwordHash).not.toBe("plaintext123")
        // bcrypt hash ขึ้นต้นด้วย $2b$ หรือ $2a$
        expect(createCall.passwordHash).toMatch(/^\$2[ab]\$\d+\$/)
    })
})

// ===================================================================
// GoogleLoginUseCase
// ===================================================================
describe("GoogleLoginUseCase", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ทดสอบการสร้าง account ใหม่เมื่อผู้ใช้เข้าสู่ระบบด้วย Google เป็นครั้งแรก
    it("should create new user account for first-time Google login", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)
        vi.mocked(mockUserRepo.create).mockResolvedValue({
            ...mockUser,
            email: "google@example.com",
        })
        vi.mocked(mockTokenRepo.save).mockResolvedValue(undefined)

        const googleLoginUseCase = new GoogleLoginUseCase(mockUserRepo, mockTokenRepo)
        const result = await googleLoginUseCase.execute({
            googleId: "google-123",
            email: "google@example.com",
            displayName: "Google User",
            emailVerified: true,
        })

        // หลังจาก refactor ใช้ accessToken แทน token
        expect(result.accessToken).toBeDefined()
        expect(result.refreshToken).toBeDefined()
        expect(mockUserRepo.create).toHaveBeenCalledTimes(1)
        // ต้องบันทึก refresh token ลง DB ด้วย
        expect(mockTokenRepo.save).toHaveBeenCalledTimes(1)
    })
})

// ===================================================================
// GithubLoginUseCase
// ===================================================================
describe("GithubLoginUseCase", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ทดสอบการสร้าง account ใหม่เมื่อผู้ใช้เข้าสู่ระบบด้วย GitHub เป็นครั้งแรก
    it("should create new user account for first-time GitHub login", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null)
        vi.mocked(mockUserRepo.create).mockResolvedValue({
            ...mockUser,
            email: "github@example.com",
        })
        vi.mocked(mockTokenRepo.save).mockResolvedValue(undefined)

        const githubLoginUseCase = new GithubLoginUseCase(mockUserRepo, mockTokenRepo)
        const result = await githubLoginUseCase.execute({
            githubId: "github-123",
            email: "github@example.com",
            emailVerified: true,
            displayName: "GitHub User",
        })

        expect(result.accessToken).toBeDefined()
        expect(result.refreshToken).toBeDefined()
        expect(mockUserRepo.create).toHaveBeenCalledTimes(1)
        expect(mockTokenRepo.save).toHaveBeenCalledTimes(1)
    })

    // ทดสอบกรณีที่ GitHub account ไม่มี public email
    it("should throw UnauthorizedError if GitHub account has no email", async () => {
        const githubLoginUseCase = new GithubLoginUseCase(mockUserRepo, mockTokenRepo)

        await expect(
            githubLoginUseCase.execute({
                githubId: "github-123",
                email: null,
                emailVerified: false,
                displayName: "GitHub User",
            })
        ).rejects.toThrow("GitHub account must have a public email address")
    })

    // ทดสอบว่า email ที่ GitHub ยังไม่ verified ต้องถูกปฏิเสธ (กัน account takeover)
    it("should throw UnauthorizedError if GitHub email is not verified", async () => {
        const githubLoginUseCase = new GithubLoginUseCase(mockUserRepo, mockTokenRepo)

        await expect(
            githubLoginUseCase.execute({
                githubId: "github-123",
                email: "github@example.com",
                emailVerified: false,
                displayName: "GitHub User",
            })
        ).rejects.toThrow("GitHub email is not verified")

        // ต้องไม่มีการแตะ DB เลยถ้า email ไม่ verified
        expect(mockUserRepo.findByEmail).not.toHaveBeenCalled()
        expect(mockUserRepo.create).not.toHaveBeenCalled()
    })
})
