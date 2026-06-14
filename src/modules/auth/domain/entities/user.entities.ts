export type Role = "USER" | "ADMIN";
export type Provider = "GOOGLE" | "FACEBOOK" | "GITHUB";

export interface UserEntity {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: Role;
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}