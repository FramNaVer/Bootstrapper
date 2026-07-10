import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import { app } from "../../../../app"
import { prisma } from "@shared/database/prisma.client"
import { generateAccessToken } from "@modules/auth/application/utils/jwt.util"

// =============================================================
// Integration test — GET /organizations/:orgId/cards (ปฏิทินรวมของ org)
//
// จุดที่ unit test ครอบไม่ได้และต้องล็อกที่นี่: เงื่อนไข filter จริงใน Prisma
// (ช่วงวันที่, การ์ด/บอร์ดที่ถูก soft-delete, รวมข้ามบอร์ด, เรียงตามวัน)
// + RBAC ที่ route + validation ของ query string
// =============================================================

const unique = Date.now()

let ownerId: string
let ownerToken: string
let outsiderId: string
let outsiderToken: string
let orgId: string

// สองใบที่ "ควรเห็น" บนปฏิทินเดือน ก.ค. 2026 (คนละบอร์ด)
let mathCardId: string
let scienceCardId: string

const JULY = { dueFrom: "2026-07-01", dueTo: "2026-07-31" }

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: `org-cards-owner-${unique}@test.local`,
      displayName: "Calendar Owner",
      isEmailVerified: true,
    },
  })
  ownerId = owner.id
  ownerToken = generateAccessToken(owner.id)

  const outsider = await prisma.user.create({
    data: {
      email: `org-cards-outsider-${unique}@test.local`,
      displayName: "Calendar Outsider",
      isEmailVerified: true,
    },
  })
  outsiderId = outsider.id
  outsiderToken = generateAccessToken(outsider.id)

  // org สร้างผ่าน API — ได้ slug + OWNER membership ตาม flow จริง
  const orgRes = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: `Calendar Org ${unique}` })
  orgId = orgRes.body.data.organization.id

  // ข้อมูลบอร์ด/การ์ดสร้างตรงผ่าน prisma — คุม dueDate/deletedAt ได้ตรงๆ
  // (endpoint ที่ทดสอบคือ GET ตัวเดียว ไม่จำเป็นต้องไล่สร้างผ่าน API ทุกชั้น)
  const mathBoard = await prisma.board.create({
    data: { organizationId: orgId, name: "Math" },
  })
  const scienceBoard = await prisma.board.create({
    data: { organizationId: orgId, name: "Science" },
  })
  // บอร์ดที่ถูกลบ (soft): ธงอยู่ที่บอร์ด การ์ดข้างในยัง deletedAt: null
  const deletedBoard = await prisma.board.create({
    data: { organizationId: orgId, name: "Old Board", deletedAt: new Date() },
  })

  const mathList = await prisma.list.create({
    data: {
      organizationId: orgId,
      boardId: mathBoard.id,
      name: "To Do",
      position: 1000,
    },
  })
  const scienceList = await prisma.list.create({
    data: {
      organizationId: orgId,
      boardId: scienceBoard.id,
      name: "To Do",
      position: 1000,
    },
  })
  const deletedBoardList = await prisma.list.create({
    data: {
      organizationId: orgId,
      boardId: deletedBoard.id,
      name: "To Do",
      position: 1000,
    },
  })

  const base = { organizationId: orgId, position: 1000 }

  // --- ควรเห็น: อยู่ในช่วง ก.ค. ทั้งคู่ ---
  const mathCard = await prisma.card.create({
    data: {
      ...base,
      boardId: mathBoard.id,
      listId: mathList.id,
      title: "ส่งการบ้านเลข",
      dueDate: new Date("2026-07-10"),
    },
  })
  mathCardId = mathCard.id
  const scienceCard = await prisma.card.create({
    data: {
      ...base,
      boardId: scienceBoard.id,
      listId: scienceList.id,
      title: "ส่งแล็บวิทย์",
      dueDate: new Date("2026-07-20"),
    },
  })
  scienceCardId = scienceCard.id

  // --- ไม่ควรเห็น: 4 กรณี ---
  await prisma.card.create({
    data: {
      ...base,
      boardId: mathBoard.id,
      listId: mathList.id,
      title: "ไม่มีกำหนดส่ง",
    },
  })
  await prisma.card.create({
    data: {
      ...base,
      boardId: mathBoard.id,
      listId: mathList.id,
      title: "นอกช่วง (ส.ค.)",
      dueDate: new Date("2026-08-15"),
    },
  })
  await prisma.card.create({
    data: {
      ...base,
      boardId: mathBoard.id,
      listId: mathList.id,
      title: "การ์ดถูกลบ",
      dueDate: new Date("2026-07-12"),
      deletedAt: new Date(),
    },
  })
  await prisma.card.create({
    data: {
      ...base,
      boardId: deletedBoard.id,
      listId: deletedBoardList.id,
      title: "อยู่บนบอร์ดที่ถูกลบ",
      dueDate: new Date("2026-07-12"),
    },
  })
})

afterAll(async () => {
  // ลบ org → cascade ลบ membership/board/list/card ทั้งหมด
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
  }
  await prisma.user
    .deleteMany({ where: { id: { in: [ownerId, outsiderId] } } })
    .catch(() => {})
  await prisma.$disconnect()
})

function getCalendar(
  query: Record<string, string>,
  token: string = ownerToken
) {
  return request(app)
    .get(`/api/v1/organizations/${orgId}/cards`)
    .query(query)
    .set("Authorization", `Bearer ${token}`)
}

describe("GET /organizations/:orgId/cards (integration)", () => {
  it("returns only due cards in range across boards, sorted by dueDate, with boardName", async () => {
    const res = await getCalendar(JULY)

    expect(res.status).toBe(200)
    const cards = res.body.data.cards as { id: string; boardName: string }[]
    // exact match ทั้งชุด+ลำดับ: พิสูจน์พร้อมกันว่า 4 กรณี "ไม่ควรเห็น" ถูกตัดหมด
    // (ไม่มีกำหนดส่ง / นอกช่วง / การ์ดถูกลบ / บอร์ดถูกลบ) และเรียงตามวันครบ
    expect(cards.map((c) => c.id)).toEqual([mathCardId, scienceCardId])
    expect(cards[0].boardName).toBe("Math")
    expect(cards[1].boardName).toBe("Science")
  })

  it("forbids a non-member (403)", async () => {
    const res = await getCalendar(JULY, outsiderToken)
    expect(res.status).toBe(403)
  })

  it("rejects unauthenticated requests (401)", async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/cards`)
      .query(JULY)
    expect(res.status).toBe(401)
  })

  it("rejects a missing dueTo (400)", async () => {
    const res = await getCalendar({ dueFrom: "2026-07-01" })
    expect(res.status).toBe(400)
  })

  it("rejects an invalid date string (400)", async () => {
    const res = await getCalendar({ dueFrom: "not-a-date", dueTo: "2026-07-31" })
    expect(res.status).toBe(400)
  })

  it("rejects dueFrom after dueTo (400)", async () => {
    const res = await getCalendar({ dueFrom: "2026-07-31", dueTo: "2026-07-01" })
    expect(res.status).toBe(400)
  })

  it("rejects a range wider than 100 days (400)", async () => {
    const res = await getCalendar({ dueFrom: "2026-01-01", dueTo: "2026-12-31" })
    expect(res.status).toBe(400)
  })
})
