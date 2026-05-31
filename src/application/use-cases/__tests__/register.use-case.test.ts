import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterUseCase } from "../register.use-case";
import { UserRepository } from "../../../domain/repositories/user.repository";
import { UserEntity } from "../../../domain/entities/user.entities";
import { GoogleLoginUseCase } from "../google-login.use-case";

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
};

const mockUserRepo: UserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findPasswordHashByUserId: vi.fn(),
    create: vi.fn(),
    linkOAuthProvider: vi.fn(),
};

describe("RegisterUseCase", () => {
    let registerUseCase: RegisterUseCase;

    beforeEach(() => {
        vi.clearAllMocks();
        registerUseCase = new RegisterUseCase(mockUserRepo);
    });

    // ทดสอบกรณีที่ผู้ใช้ลงทะเบียนสำเร็จ
    it("should register a new user successfully", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
        vi.mocked(mockUserRepo.create).mockResolvedValue(mockUser);

        const result = await registerUseCase.execute({
            email: "test@example.com",
            password: "password123",
            displayName: "Test User",
        });

        expect(mockUserRepo.findByEmail).toHaveBeenCalledWith("test@example.com");
        expect(mockUserRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                email: "test@example.com",
                displayName: "Test User",
                passwordHash: expect.any(String),
            })
        );
        expect(result).toEqual(mockUser);
    });

    // ทดสอบกรณีที่ผู้ใช้พยายามลงทะเบียนด้วยอีเมลที่มีอยู่แล้วในระบบ
    it("should throw error if user already exists", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(mockUser);

        await expect(
            registerUseCase.execute({
                email: "test@example.com",
                password: "password123",
            })
        ).rejects.toThrow("User already exists");

        expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    // ทดสอบว่า password ถูก hash ก่อนที่จะถูกบันทึกลงในฐานข้อมูล
    it("should hash the password before saving", async () => {
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
        vi.mocked(mockUserRepo.create).mockResolvedValue(mockUser);

        await registerUseCase.execute({
            email: "test@example.com",
            password: "plaintext123",
        });

        const createCall = vi.mocked(mockUserRepo.create).mock.calls[0][0];
        expect(createCall.passwordHash).not.toBe("plaintext123");
        expect(createCall.passwordHash).toMatch(/^\$2[ab]\$\d+\$/);
    });

    // เพิ่มเติมสำหรับ GoogleLoginUseCase เพื่อทดสอบการสร้าง account ใหม่เมื่อผู้ใช้เข้าสู่ระบบด้วย Google และยังไม่มีบัญชีในระบบ
    it("Google login — new user || should create new user account", async () => {
        process.env.JWT_SECRET = "test-secret";
        vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
        vi.mocked(mockUserRepo.create).mockResolvedValue({
            id: "123",
            email: "google-example@gmail.com",
            displayName: "John",
            avatarUrl: null,
            role: "USER",
            isEmailVerified: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const googleLoginUseCase = new GoogleLoginUseCase(mockUserRepo);
        const result = await googleLoginUseCase.execute({
            googleId: "google-123",
            email: "google-example@gmail.com",
            displayName: "John",
        });

        expect(result.token).toBeDefined();
        expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
    })
});
