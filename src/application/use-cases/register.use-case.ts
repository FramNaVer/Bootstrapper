import bcrypt from 'bcrypt';
import { UserRepository } from '../../domain/repositories/user.repository';

export class RegisterUseCase {
    constructor(private userRepo: UserRepository) {}

    async execute(email: string, password: string, displayName?: string) {
        const existingUser = await this.userRepo.findByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userData = {
            email,
            displayName,
            passwordHash
        };

        return this.userRepo.create(userData);
    }
}