// =============================================================
// Data migration: normalize email เป็น lowercase ทั้ง DB (รันครั้งเดียว)
//
// ใช้:  npx ts-node -r tsconfig-paths/register scripts/normalize-emails.ts
//       (default = dry-run แสดงว่าจะแก้อะไรบ้าง ไม่เขียนจริง)
//       npx ts-node -r tsconfig-paths/register scripts/normalize-emails.ts --apply
//       (เขียนจริง)
//
// ทำไมต้องมี: โค้ดรุ่นก่อนไม่ได้ normalize email ตอนรับเข้า → DB อาจมี email
// ตัวพิมพ์ใหญ่ปน ทำให้ login ไม่ผ่าน / OAuth สร้างบัญชีซ้ำ / รับคำเชิญไม่ได้
// หลัง deploy โค้ดที่ normalize ทางเข้าแล้ว ให้รันสคริปต์นี้เก็บข้อมูลเก่าทันที
//
// ความปลอดภัย:
// - dry-run โดย default — ตรวจผลก่อนค่อยใส่ --apply
// - ถ้าพบ "การชน" (หลาย user ที่ email ต่างกันแค่ case) จะไม่แตะกลุ่มนั้นเลย
//   แค่รายงานให้ตัดสินใจ merge เอง — สคริปต์ไม่เดาว่าบัญชีไหนคือตัวจริง
// - รันซ้ำได้ (idempotent): แถวที่ normalize แล้วจะไม่ถูกแตะอีก
// =============================================================
import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@generated/prisma"
import { normalizeEmail } from "@shared/utils/email.util"

// ประกอบ client แบบเดียวกับ @shared/database/prisma.client (Prisma 7 ต้องมี
// driver adapter) — แต่สร้าง pool ของตัวเองเพื่อปิดได้ตอนจบ ให้ process ออกสะอาด
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const apply = process.argv.includes("--apply")

async function main() {
  console.log(apply ? "โหมด: APPLY (เขียนจริง)" : "โหมด: dry-run (ไม่เขียน — ใส่ --apply เพื่อเขียนจริง)")

  // --- 1) User.email (unique) — ต้องตรวจการชนก่อนแก้ ---
  const users = await prisma.user.findMany({
    select: { id: true, email: true, createdAt: true },
  })

  const byLower = new Map<string, typeof users>()
  for (const u of users) {
    const key = normalizeEmail(u.email)
    byLower.set(key, [...(byLower.get(key) ?? []), u])
  }

  let userUpdates = 0
  let collisionGroups = 0
  for (const [lower, group] of byLower) {
    if (group.length > 1) {
      // สองบัญชีขึ้นไปยุบเป็น email เดียวกัน → unique ชนแน่ ห้ามแก้อัตโนมัติ
      collisionGroups++
      console.warn(`⚠ ชนกัน (ต้อง merge เอง): ${lower}`)
      for (const u of group) {
        console.warn(`   - ${u.id}  "${u.email}"  (สมัคร ${u.createdAt.toISOString()})`)
      }
      continue
    }
    const [u] = group
    if (u.email === lower) continue

    userUpdates++
    console.log(`user ${u.id}: "${u.email}" → "${lower}"`)
    if (apply) {
      await prisma.user.update({ where: { id: u.id }, data: { email: lower } })
    }
  }

  // --- 2) Invitation.email (ไม่ unique) — แก้ได้ตรงๆ ---
  // แก้ทุกสถานะไม่ใช่แค่ PENDING เพื่อให้ข้อมูลทั้งตารางอยู่ในรูปแบบเดียวกัน
  const invitations = await prisma.invitation.findMany({
    select: { id: true, email: true, status: true },
  })
  let invitationUpdates = 0
  for (const inv of invitations) {
    const lower = normalizeEmail(inv.email)
    if (inv.email === lower) continue

    invitationUpdates++
    console.log(`invitation ${inv.id} (${inv.status}): "${inv.email}" → "${lower}"`)
    if (apply) {
      await prisma.invitation.update({ where: { id: inv.id }, data: { email: lower } })
    }
  }

  console.log("")
  console.log(`สรุป: user ${apply ? "แก้แล้ว" : "จะแก้"} ${userUpdates} แถว, invitation ${invitationUpdates} แถว`)
  if (collisionGroups > 0) {
    console.warn(
      `⚠ พบ ${collisionGroups} กลุ่มที่ email ชนกันข้าม case — ยังไม่ถูกแก้ ต้องตัดสินใจ merge เอง\n` +
        `  (บัญชีไหนคือของจริงให้ดูจากกิจกรรม/membership แล้วย้ายข้อมูลก่อนลบอีกบัญชี)`
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
