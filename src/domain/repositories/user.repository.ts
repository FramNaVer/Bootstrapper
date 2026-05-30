import { UserEntity, Provider } from "../entities/user.entities";

export interface UserRepository {
    findById(id: string): Promise<UserEntity | null>;
    findByEmail(email: string): Promise<UserEntity | null>;
    findPasswordHashByUserId(userId: string): Promise<string | null>;
    create(data: CreateUserData): Promise<UserEntity>;
}

export interface CreateUserData {
    email: string;
    displayName?: string;
    passwordHash?: string;
    provider?: Provider;
    providerUserId?: string;
}