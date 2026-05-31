import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegisterUseCase } from "../register.use-case";
import { UserRepository } from "../../../domain/repositories/user.repository";
import { UserEntity } from "../../../domain/entities/user.entities";

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
});
