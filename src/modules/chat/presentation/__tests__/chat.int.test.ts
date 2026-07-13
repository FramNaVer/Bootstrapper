import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import { app } from "../../../../app"
import { prisma } from "@shared/database/prisma.client"
import { generateAccessToken } from "@modules/auth/application/utils/jwt.util"

// =============================================================
// Integration test — แชทของ org (/organizations/:orgId/messages)
// จุดที่ต้องล็อกด้วย DB จริง: ลำดับใหม่→เก่า, cursor เดินครบทุกหน้า
// ไม่ซ้ำไม่ข้าม, การ join ชื่อผู้เขียน, RBAC, validation
// =============================================================

const unique = Date.now()

let ownerId: string
let ownerToken: string
let outsiderId: string
let outsiderToken: string
let orgId: string

beforeAll(async () => {
  const owner = await prisma.user.create({
    data: {
      email: `chat-int-owner-${unique}@test.local`,
      displayName: "Chat Owner",
      isEmailVerified: true,
    },
  })
  ownerId = owner.id
  ownerToken = generateAccessToken(owner.id)

  const outsider = await prisma.user.create({
    data: {
      email: `chat-int-outsider-${unique}@test.local`,
      displayName: "Chat Outsider",
      isEmailVerified: true,
    },
  })
  outsiderId = outsider.id
  outsiderToken = generateAccessToken(outsider.id)

  const orgRes = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: `Chat Org ${unique}` })
  orgId = orgRes.body.data.organization.id
})

afterAll(async () => {
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
  }
  await prisma.user
    .deleteMany({ where: { id: { in: [ownerId, outsiderId] } } })
    .catch(() => {})
  await prisma.$disconnect()
})

function sendMessage(body: string, token: string = ownerToken) {
  return request(app)
    .post(`/api/v1/organizations/${orgId}/messages`)
    .set("Authorization", `Bearer ${token}`)
    .send({ body })
}

function listMessages(query: Record<string, string> = {}) {
  return request(app)
    .get(`/api/v1/organizations/${orgId}/messages`)
    .query(query)
    .set("Authorization", `Bearer ${ownerToken}`)
}

describe("Chat module (integration)", () => {
  it("sends a message and returns it with author info (201)", async () => {
    const res = await sendMessage("สวัสดีครับ ทุกคน")

    expect(res.status).toBe(201)
    const msg = res.body.data.message
    expect(msg.body).toBe("สวัสดีครับ ทุกคน")
    expect(msg.authorId).toBe(ownerId)
    expect(msg.authorName).toBe("Chat Owner")
    expect(msg.organizationId).toBe(orgId)
  })

  it("lists messages newest-first and pages with cursor without gaps or repeats", async () => {
    // มีอยู่แล้ว 1 จากเทสก่อน → เติมให้ครบ 5 (ส่งเรียงลำดับ กันเวลาชนกัน)
    for (let i = 2; i <= 5; i++) {
      await sendMessage(`ข้อความที่ ${i}`)
    }

    // หน้าแรก limit 2 → ใหม่สุดก่อน (5, 4) และมีหน้าถัดไป
    const page1 = await listMessages({ limit: "2" })
    expect(page1.status).toBe(200)
    const bodies1 = page1.body.data.messages.map((m: { body: string }) => m.body)
    expect(bodies1).toEqual(["ข้อความที่ 5", "ข้อความที่ 4"])
    expect(page1.body.data.nextCursor).toBeTruthy()

    // หน้าสอง: ต่อจาก cursor เป๊ะๆ ไม่ซ้ำไม่ข้าม
    const page2 = await listMessages({
      limit: "2",
      cursor: page1.body.data.nextCursor,
    })
    const bodies2 = page2.body.data.messages.map((m: { body: string }) => m.body)
    expect(bodies2).toEqual(["ข้อความที่ 3", "ข้อความที่ 2"])

    // หน้าสุดท้าย: เหลือใบเดียว → nextCursor ต้องเป็น null (จบจริง)
    const page3 = await listMessages({
      limit: "2",
      cursor: page2.body.data.nextCursor,
    })
    expect(page3.body.data.messages).toHaveLength(1)
    expect(page3.body.data.nextCursor).toBeNull()
  })

  it("forbids a non-member from reading (403)", async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/messages`)
      .set("Authorization", `Bearer ${outsiderToken}`)
    expect(res.status).toBe(403)
  })

  it("forbids a non-member from sending (403)", async () => {
    const res = await sendMessage("แอบส่ง", outsiderToken)
    expect(res.status).toBe(403)
  })

  it("rejects unauthenticated requests (401)", async () => {
    const res = await request(app).get(
      `/api/v1/organizations/${orgId}/messages`
    )
    expect(res.status).toBe(401)
  })

  it("rejects an empty / whitespace-only body (400)", async () => {
    const res = await sendMessage("   ")
    expect(res.status).toBe(400)
  })

  it("rejects a body longer than 2000 characters (400)", async () => {
    const res = await sendMessage("ก".repeat(2001))
    expect(res.status).toBe(400)
  })

  it("rejects a limit above 100 (400)", async () => {
    const res = await listMessages({ limit: "101" })
    expect(res.status).toBe(400)
  })
})
