import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import { app } from "../../../../app"
import { prisma } from "@shared/database/prisma.client"
import { generateAccessToken } from "@modules/auth/application/utils/jwt.util"

// =============================================================
// Integration test — ยิง HTTP จริงผ่าน middleware + RBAC + Prisma + Neon
// ครอบสิ่งที่ unit test ครอบไม่ได้: auth, RBAC ที่ route, การต่อ DB จริง
//
// สร้าง/ลบข้อมูลจริงใน DB — มี cleanup ใน afterAll
// =============================================================

const unique = Date.now()

let ownerId: string
let ownerToken: string
let outsiderId: string
let outsiderToken: string

let orgId: string
let boardId: string
let todoListId: string
let doneListId: string
let cardId: string

beforeAll(async () => {
  // owner = คนสร้าง org (จะกลายเป็น OWNER อัตโนมัติ)
  const owner = await prisma.user.create({
    data: {
      email: `board-int-owner-${unique}@test.local`,
      displayName: "Int Owner",
      isEmailVerified: true,
    },
  })
  ownerId = owner.id
  ownerToken = generateAccessToken(owner.id)

  // outsider = user ที่ไม่ได้เป็นสมาชิก org นี้ (ใช้ทดสอบ RBAC)
  const outsider = await prisma.user.create({
    data: {
      email: `board-int-outsider-${unique}@test.local`,
      displayName: "Int Outsider",
      isEmailVerified: true,
    },
  })
  outsiderId = outsider.id
  outsiderToken = generateAccessToken(outsider.id)
})

afterAll(async () => {
  // ลบ org → cascade ลบ membership/board/list/card/activity ทั้งหมด
  if (orgId) {
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
  }
  await prisma.user
    .deleteMany({ where: { id: { in: [ownerId, outsiderId] } } })
    .catch(() => {})
  await prisma.$disconnect()
})

describe("Board module (integration)", () => {
  // -----------------------------------------------------------
  // Happy path: org → board → lists → card → move → activity
  // -----------------------------------------------------------
  it("creates an organization (creator becomes OWNER)", async () => {
    const res = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: `Int Org ${unique}` })

    expect(res.status).toBe(201)
    expect(res.body.data.organization.id).toBeDefined()
    orgId = res.body.data.organization.id
  })

  it("creates a board under the organization", async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgId}/boards`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Sprint Board" })

    expect(res.status).toBe(201)
    boardId = res.body.data.board.id
    expect(boardId).toBeDefined()
  })

  it("creates two lists (To Do, Done) with increasing positions", async () => {
    const todo = await request(app)
      .post(`/api/v1/organizations/${orgId}/boards/${boardId}/lists`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "To Do" })
    const done = await request(app)
      .post(`/api/v1/organizations/${orgId}/boards/${boardId}/lists`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Done" })

    expect(todo.status).toBe(201)
    expect(done.status).toBe(201)
    todoListId = todo.body.data.list.id
    doneListId = done.body.data.list.id
    // list ที่สองต้อง position มากกว่าใบแรก (ต่อท้าย)
    expect(done.body.data.list.position).toBeGreaterThan(
      todo.body.data.list.position
    )
  })

  it("creates a card in the To Do list", async () => {
    const res = await request(app)
      .post(`/api/v1/organizations/${orgId}/boards/${boardId}/cards`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ listId: todoListId, title: "Write tests" })

    expect(res.status).toBe(201)
    cardId = res.body.data.card.id
    expect(res.body.data.card.listId).toBe(todoListId)
  })

  it("moves the card from To Do to Done", async () => {
    const res = await request(app)
      .patch(
        `/api/v1/organizations/${orgId}/boards/${boardId}/cards/${cardId}/move`
      )
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ targetListId: doneListId, position: 500 })

    expect(res.status).toBe(200)
    expect(res.body.data.card.listId).toBe(doneListId)
  })

  it("records CARD_CREATED and CARD_MOVED in the activity feed", async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/boards/${boardId}/activities`)
      .set("Authorization", `Bearer ${ownerToken}`)

    expect(res.status).toBe(200)
    const actions = res.body.data.activities.map(
      (a: { action: string }) => a.action
    )
    expect(actions).toContain("CARD_CREATED")
    expect(actions).toContain("CARD_MOVED")
  })

  // -----------------------------------------------------------
  // Security: auth + RBAC + tenant isolation
  // -----------------------------------------------------------
  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get(
      `/api/v1/organizations/${orgId}/boards`
    )
    expect(res.status).toBe(401)
  })

  it("forbids a non-member from listing the org's boards (403)", async () => {
    const res = await request(app)
      .get(`/api/v1/organizations/${orgId}/boards`)
      .set("Authorization", `Bearer ${outsiderToken}`)
    expect(res.status).toBe(403)
  })

  it("returns 404 for a board id that is not in this org (no cross-tenant leak)", async () => {
    const res = await request(app)
      .get(
        `/api/v1/organizations/${orgId}/boards/00000000-0000-0000-0000-000000000000`
      )
      .set("Authorization", `Bearer ${ownerToken}`)
    expect(res.status).toBe(404)
  })
})
