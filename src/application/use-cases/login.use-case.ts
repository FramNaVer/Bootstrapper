import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../domain/repositories/user.repository';

export class LoginUseCase {
    constructor(private userRepo: UserRepository) {}

    async execute(email: string, password: string){
        const user = await this.userRepo.findByEmail(email);
        if(!user){
            throw new Error('Invalid email or password');
        }

        const passwordHash = await this.userRepo.findPasswordHashByUserId(user.id);
        if(!passwordHash){
            throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, passwordHash);
        if(!isPasswordValid){
            throw new Error('Invalid email or password');
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
        return {token, user}
    }
}

