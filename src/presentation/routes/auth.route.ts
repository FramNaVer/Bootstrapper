import { Router } from "express"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../../generated/prisma";
import { PrismaUserRepository } from "../../infrastructure/repositories/prisma-user.repository"
import { RegisterUseCase } from "../../application/use-cases/register.use-case"
import { LoginUseCase } from "../../application/use-cases/login.use-case"
import { AuthController } from "../controllers/auth.controller"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const router = Router()

//Dependency Injection
const userRepo = new PrismaUserRepository(prisma)
const registerUseCase = new RegisterUseCase(userRepo)
const loginUseCase = new LoginUseCase(userRepo)
const authController = new AuthController(registerUseCase, loginUseCase)

router.post('/register', authController.register)
router.post('/login', authController.login)

export default router