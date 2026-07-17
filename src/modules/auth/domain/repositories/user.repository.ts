import { UserEntity, Provider } from "../entities/user.entities";

export interface UserRepository {
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    findPasswordHashByUserId(userId: string): Promise<string | null>;
    create(data: CreateUserData): Promise<UserEntity>;
    linkOAuthProvider(userId: string, data: LinkOAuthData): Promise<void>;
    markEmailVerified(userId: string): Promise<void>;
    updatePassword(userId: string, passwordHash: string): Promise<void>;
    // อัปเดตเวลา active ล่าสุด (เรียกจาก socket heartbeat) — ใช้แสดงสถานะออนไลน์
    updateLastSeen(userId: string, at: Date): Promise<void>;
}

export interface CreateUserData {
    email: string;
    displayName?: string;
    avatarUrl?: string;
    passwordHash?: string;
    emailVerified?: boolean;
    provider?: Provider;
    providerUserId?: string;
}

export interface LinkOAuthData {
    provider: Provider;
    providerUserId: string;
    accessToken?: string;
}