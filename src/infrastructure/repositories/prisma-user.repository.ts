import { PrismaClient } from "../../../generated/prisma";
import { UserRepository, CreateUserData, LinkOAuthData } from "../../domain/repositories/user.repository";

export class PrismaUserRepository implements UserRepository {
    constructor(private prisma: PrismaClient) { }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async findPasswordHashByUserId(userId: string) {
        const record = await this.prisma.userPassword.findUnique({
            where: { userId },
        });
        return record?.passwordHash ?? null;
    }

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
