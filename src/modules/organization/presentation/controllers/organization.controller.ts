import { Request, Response, NextFunction } from "express"
import { CreateOrganizationUseCase } from "../../application/use-cases/create-organization.use-case"
import { ListMyOrganizationsUseCase } from "../../application/use-cases/list-my-organizations.use-case"

export class OrganizationController {
  constructor(
    private createOrganizationUseCase: CreateOrganizationUseCase,
    private listMyOrganizationsUseCase: ListMyOrganizationsUseCase
  ) {}

  createOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.userId ถูกใส่โดย authenticate middleware (route นี้ผ่าน middleware มาแล้ว)
      const userId = req.userId!
      const { name } = req.body
      const organization = await this.createOrganizationUseCase.execute(userId, name)
      res.status(201).json({
        success: true,
        message: "Organization created successfully",
        data: { organization },
      })
    } catch (error) {
      next(error)
    }
  }

  listMyOrganizations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!
      const organizations = await this.listMyOrganizationsUseCase.execute(userId)
      res.status(200).json({
        success: true,
        message: "Organizations retrieved successfully",
        data: { organizations },
      })
    } catch (error) {
      next(error)
    }
  }
}
