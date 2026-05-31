import { Request, Response } from "express"
import { RegisterUseCase } from "../../application/use-cases/register.use-case"
import { LoginUseCase } from "../../application/use-cases/login.use-case"
import { GoogleLoginUseCase } from "../../application/use-cases/google-login.use-case"

export class AuthController {
    constructor(
        private registerUseCase: RegisterUseCase,
        private loginUseCase: LoginUseCase,
        private googleLoginUseCase: GoogleLoginUseCase,
    ) {}

    register = async (req: Request, res: Response) => {
        try {
            const { displayName, email, password } = req.body
            const user = await this.registerUseCase.execute({ displayName, email, password })
            res.status(201).json({ user })
        }catch (error: any) {    
            res.status(400).json({ message: error.message })        
        }
    }

    login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body
            const result = await this.loginUseCase.execute({ email, password })
            res.status(200).json({ result })
        }catch (error: any) {
            res.status(400).json({ message: error.message })
        }
    }

    googleLogin = async (req: Request, res: Response) => {
        try {
            const result = req.user as { token: string; user: any }
            res.status(200).json(result)
        } catch (error: any) {
            res.status(400).json({ message: error.message })
        }
    }
}