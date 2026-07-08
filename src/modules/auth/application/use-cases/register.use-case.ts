import { UserRepository } from "../../domain/repositories/user.repository"
import { ConflictError } from "@shared/errors/app.error"
import { hashPassword } from "../utils/password.util"

export class RegisterUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute({
    email,
    password,
    displayName,
  }: {
    email: string
    password: string
    displayName?: string
  }) {
    // ตรวจสอบว่า email ถูกใช้ไปแล้วหรือยัง
    const existingUser = await this.userRepo.findByEmail(email)
    if (existingUser) {
      throw new ConflictError("Email is already registered")
    }

    const passwordHash = await hashPassword(password)
    return this.userRepo.create({ email, displayName, passwordHash })
  }
}
