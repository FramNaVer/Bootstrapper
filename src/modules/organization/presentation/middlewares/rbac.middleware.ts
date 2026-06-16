import { Request, Response, NextFunction } from "express"
import { ForbiddenError } from "@shared/errors/app.error"
import { MembershipRepository } from "../../domain/repositories/membership.repository"
import { MembershipRole } from "../../domain/entities/membership.entity"

// RBAC guard — ใช้ต่อจาก authenticate (ซึ่งใส่ req.userId มาแล้ว)
// ตรวจว่าผู้เรียกเป็นสมาชิกของ org (จาก :orgId) และมี role ที่อนุญาต
//
// เป็น "factory" รับ repository เข้ามา → คืน middleware
// (เพราะ middleware ต้อง query DB แต่ไม่ควรรู้จัก Prisma ตรงๆ)
export function requireRole(
  membershipRepo: MembershipRepository,
  ...allowedRoles: MembershipRole[]
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.userId!
    const orgId = req.params.orgId as string

    const membership = await membershipRepo.findByUserAndOrg(userId, orgId)
    if (!membership) {
      return next(new ForbiddenError("You are not a member of this organization"))
    }

    // ถ้าระบุ role ที่อนุญาตไว้ และ role ของผู้เรียกไม่อยู่ในนั้น → ห้าม
    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
      return next(new ForbiddenError("Insufficient permissions"))
    }

    // แนบ role ไว้ให้ controller/use case ใช้ตัดสินใจกฎธุรกิจต่อ
    req.membershipRole = membership.role
    next()
  }
}

// shortcut: แค่ต้องเป็นสมาชิก (role ใดก็ได้)
export function requireMembership(membershipRepo: MembershipRepository) {
  return requireRole(membershipRepo)
}
