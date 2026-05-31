import { Router } from "express"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../../generated/prisma";
import { PrismaUserRepository } from "../../infrastructure/repositories/prisma-user.repository"
import { RegisterUseCase } from "../../application/use-cases/register.use-case"
import { LoginUseCase } from "../../application/use-cases/login.use-case"
import { GoogleLoginUseCase } from "../../application/use-cases/google-login.use-case"
import { AuthController } from "../controllers/auth.controller"
import { setupPassport } from "../../infrastructure/config/passport.config"
import passport from "passport"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const router = Router()

//Dependency Injection
const userRepo = new PrismaUserRepository(prisma)
const registerUseCase = new RegisterUseCase(userRepo)
const loginUseCase = new LoginUseCase(userRepo)
const googleLoginUseCase = new GoogleLoginUseCase(userRepo)
const authController = new AuthController(registerUseCase, loginUseCase, googleLoginUseCase)

setupPassport(googleLoginUseCase)

//local auth
router.post('/register', authController.register)
router.post('/login', authController.login)

//google oauth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), authController.googleLogin)

export default router