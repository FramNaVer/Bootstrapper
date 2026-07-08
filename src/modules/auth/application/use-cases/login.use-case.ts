import { UserRepository } from "../../domain/repositories/user.repository";
import { TokenRepository } from "../../domain/repositories/token.repository";
import { UnauthorizedError, ForbiddenError } from "@shared/errors/app.error";
import {
    generateAccessToken,
    generateRefreshToken,
    getRefreshTokenExpiry,
} from "../utils/jwt.util";
import { verifyPassword } from "../utils/password.util";

export class LoginUseCase {
    constructor(
        private userRepo: UserRepository,
        private tokenRepo: TokenRepository,
    ) { }

    async execute({ email, password }: { email: string; password: string }) {
        // ใช้ error message เดียวกันทั้ง email ผิดและ password ผิด
        // เพื่อป้องกัน user enumeration attack (ไม่ให้ผู้โจมตีรู้ว่า email มีอยู่หรือไม่)
        const user = await this.userRepo.findByEmail(email);
        if (!user || !user.isActive) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const passwordHash = await this.userRepo.findPasswordHashByUserId(user.id);
        if (!passwordHash) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const isPasswordValid = await verifyPassword(password, passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedError("Invalid email or password");
        }

        // บังคับยืนยันอีเมลก่อนใช้งาน — ต้องเช็ค "หลัง" ตรวจรหัสผ่านเท่านั้น
        // ถ้าเช็คก่อน คนที่ไม่รู้รหัสจะใช้หน้า login สืบได้ว่า email นี้มีบัญชี
        // (user enumeration) — เช็คหลัง = คนเห็นข้อความนี้คือเจ้าของบัญชีจริงแน่นอน
        if (!user.isEmailVerified) {
            throw new ForbiddenError(
                "Please verify your email before signing in",
                "EMAIL_NOT_VERIFIED"
            );
        }

        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // บันทึก refresh token ลง DB เพื่อให้ revoke ได้ตอน logout
        await this.tokenRepo.save(user.id, refreshToken, getRefreshTokenExpiry());

        return { accessToken, refreshToken, user };
    }
}
