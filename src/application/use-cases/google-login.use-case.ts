import { UserRepository } from "../../domain/repositories/user.repository";
import jwt from "jsonwebtoken";

export class GoogleLoginUseCase {
    constructor(private userRepo: UserRepository) { }

    async execute(profile: {
        googleId: string;
        email: string;
        displayName: string;
        avatarUrl?: string;
    }) {
        // หา user จาก email ก่อน
        let user = await this.userRepo.findByEmail(profile.email);

        if (!user) {
            user = await this.userRepo.create({
                email: profile.email,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                provider: "GOOGLE",
                providerUserId: profile.googleId,
            });
        } else {
            // มีแล้ว  เชื่อม Google เข้ากับ account เดิม
            await this.userRepo.linkOAuthProvider(user.id, {
                provider: "GOOGLE",
                providerUserId: profile.googleId,
            });
        }

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "1d",
        });

        return { token, user };
    }
}
