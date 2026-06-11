import { PrismaClient } from "../../../generated/prisma";
import { UserRepository, CreateUserData, LinkOAuthData } from "../../domain/repositories/user.repository";

export class PrismaUserRepository implements UserRepository {
    constructor(private prisma: PrismaClient) { }

    // หา user ด้วย email (ใช้ร่วมกันหลาย flow: login, register, OAuth)
    // ไม่กรอง isActive ที่นี่ — การเช็ค active เป็น business rule ของ login use case
    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    // Method นี้ใช้สำหรับเช็คว่า user มีอยู่หรือไม่ (ใช้ใน OAuth login flow)
    async findById(id: string) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    // Method นี้ใช้สำหรับดึง password hash ของ user มาเช็คตอน login
    async findPasswordHashByUserId(userId: string) {
        const record = await this.prisma.userPassword.findUnique({
            where: { userId },
        });
        return record?.passwordHash ?? null;
    }

    // Method นี้ใช้สำหรับสร้าง user ใหม่ (ใช้ใน register flow และ OAuth login flow)
    async create(data: CreateUserData) {
        return this.prisma.user.create({
            data: {
                email: data.email,
                displayName: data.displayName,
                avatarUrl: data.avatarUrl,
                ...(data.passwordHash && {
                    passwordHash: {
                        create: { passwordHash: data.passwordHash },
                    },
                }),
                ...(data.provider && data.providerUserId && {
                    oauthProviders: {
                        create: {
                            provider: data.provider,
                            providerUserId: data.providerUserId,
                            accessToken: data.providerUserId ?? "",
                        },
                    },
                }),
            },
        });
    }

    // Method นี้ใช้สำหรับเชื่อมบัญชี OAuth กับ user ที่มีอยู่แล้ว
    async linkOAuthProvider(userId: string, data: LinkOAuthData) {
        await this.prisma.userOAuthProvider.upsert({
            where: {
                provider_providerUserId: {
                    provider: data.provider,
                    providerUserId: data.providerUserId,
                },
            },
            create: {
                userId,
                provider: data.provider,
                providerUserId: data.providerUserId,
                accessToken: data.accessToken ?? "",
            },
            update: {
                accessToken: data.accessToken ?? "",
            },
        });
    }
}
