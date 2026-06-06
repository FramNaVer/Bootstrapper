import bcrypt from "bcrypt"
import { UserRepository } from "../../domain/repositories/user.repository"
import { ConflictError } from "../../domain/errors/app.error"

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

    const passwordHash = await bcrypt.hash(password, 10)
    return this.userRepo.create({ email, displayName, passwordHash })
  }
}
