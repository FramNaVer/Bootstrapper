// =============================================================
// Seed บัญชีเดโม่สำหรับ portfolio reviewers
//
// ใช้:  npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts <password>
//
// พฤติกรรม (รันซ้ำได้):
//  - user demo@tanadon-i.com: มีอยู่แล้ว = อัปเดตรหัสผ่าน/ยืนยันอีเมลให้
//  - org เดโม่ (slug "demo-workspace"): ลบทิ้งแล้วสร้างใหม่ทั้งชุด
//    → ข้อมูลตัวอย่างกลับมาสภาพดีเสมอ ไม่ว่าคนดูเดโม่จะรื้อไปแค่ไหน
// =============================================================
import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@generated/prisma"
import { hashPassword } from "@modules/auth/application/utils/password.util"

const DEMO_EMAIL = "demo@tanadon-i.com"
const ORG_SLUG = "demo-workspace"
const GAP = 1000 // ช่องว่าง position เดียวกับที่แอปใช้

const day = (n: number) => new Date(Date.now() + n * 86_400_000)

// Prisma 7 ต้องประกอบ driver adapter เอง (แบบเดียวกับ normalize-emails.ts)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const password = process.argv[2]
  if (!password || password.length < 8) {
    console.error(
      "Usage: npx ts-node -r tsconfig-paths/register scripts/seed-demo.ts <password>  (อย่างน้อย 8 ตัวอักษร)"
    )
    process.exit(1)
  }

  // --- 1) ผู้ใช้เดโม่ ---
  const passwordHash = await hashPassword(password)
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { isEmailVerified: true, isActive: true },
    create: {
      email: DEMO_EMAIL,
      displayName: "Demo User",
      isEmailVerified: true,
    },
  })
  await prisma.userPassword.upsert({
    where: { userId: user.id },
    update: { passwordHash },
    create: { userId: user.id, passwordHash },
  })

  // --- 2) รีเซ็ต org เดโม่ (cascade ลบ board/card/message เก่าทั้งหมด) ---
  await prisma.organization.deleteMany({ where: { slug: ORG_SLUG } })
  const org = await prisma.organization.create({
    data: {
      name: "Demo Workspace",
      slug: ORG_SLUG,
      createdById: user.id,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  })

  // --- 3) บอร์ดหลัก: Sprint Board (3 คอลัมน์ + ป้าย + กำหนดส่ง) ---
  const sprint = await prisma.board.create({
    data: { organizationId: org.id, name: "Sprint Board" },
  })
  const [todo, doing, doneList] = [
    await prisma.list.create({
      data: { organizationId: org.id, boardId: sprint.id, name: "To Do", position: GAP },
    }),
    await prisma.list.create({
      data: { organizationId: org.id, boardId: sprint.id, name: "กำลังทำ", position: GAP * 2 },
    }),
    await prisma.list.create({
      data: { organizationId: org.id, boardId: sprint.id, name: "เสร็จแล้ว", position: GAP * 3 },
    }),
  ]

  const [bug, feature] = [
    await prisma.label.create({
      data: { organizationId: org.id, boardId: sprint.id, name: "Bug", color: "#EB5A46" },
    }),
    await prisma.label.create({
      data: { organizationId: org.id, boardId: sprint.id, name: "Feature", color: "#61BD4F" },
    }),
  ]

  // การ์ดกระจาย 3 คอลัมน์ — บางใบมีกำหนดส่ง (มีทั้งเลยกำหนด/ใกล้ถึง) ให้ปฏิทินมีของโชว์
  const cardData = [
    { list: todo, title: "ออกแบบหน้า landing page", due: day(3), label: feature.id },
    { list: todo, title: "แก้บั๊กปุ่ม logout บนมือถือ", due: day(-1), label: bug.id },
    { list: todo, title: "เขียนเอกสาร API", due: null, label: null },
    { list: doing, title: "ทำระบบแจ้งเตือนอีเมล", due: day(1), label: feature.id },
    { list: doing, title: "รีวิวโค้ดของทีม", due: null, label: null },
    { list: doneList, title: "ตั้งค่า CI/CD pipeline", due: day(-3), label: null },
  ]
  let pos = 0
  for (const c of cardData) {
    pos += GAP
    await prisma.card.create({
      data: {
        organizationId: org.id,
        boardId: sprint.id,
        listId: c.list.id,
        title: c.title,
        position: pos,
        dueDate: c.due,
        ...(c.label ? { labels: { create: { labelId: c.label } } } : {}),
      },
    })
  }

  // --- 4) บอร์ดที่สอง (ให้ rail/ปฏิทินเห็นข้อมูลข้ามบอร์ด) ---
  const classroom = await prisma.board.create({
    data: { organizationId: org.id, name: "งานห้องเรียน" },
  })
  const hwList = await prisma.list.create({
    data: { organizationId: org.id, boardId: classroom.id, name: "การบ้าน", position: GAP },
  })
  await prisma.card.create({
    data: {
      organizationId: org.id,
      boardId: classroom.id,
      listId: hwList.id,
      title: "ส่งรายงานกลุ่ม บทที่ 4",
      position: GAP,
      dueDate: day(5),
    },
  })

  // --- 5) ข้อความแชทตัวอย่าง ---
  const chatLines = [
    "ยินดีต้อนรับสู่ Demo Workspace 👋",
    "ลองลากการ์ดในบอร์ด Sprint Board ดูได้เลย",
    "กำหนดส่งของทุกบอร์ดรวมอยู่ในปฏิทินหน้า org นะ",
  ]
  for (const body of chatLines) {
    await prisma.message.create({
      data: { organizationId: org.id, authorId: user.id, body },
    })
  }

  console.log("✔ Demo seeded")
  console.log(`  อีเมล    : ${DEMO_EMAIL}`)
  console.log(`  รหัสผ่าน : (ตามที่ส่งเข้ามา)`)
  console.log(`  org      : ${org.name} (บอร์ด 2, การ์ด 7, ข้อความแชท 3)`)
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
