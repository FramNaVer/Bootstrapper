import { describe, it, expect, beforeAll, afterAll } from "vitest"
import request from "supertest"
import { app } from "../../../../app"
import { prisma } from "@shared/database/prisma.client"
import { hashPassword } from "../../application/utils/password.util"

// =============================================================
// Integration test — refresh token ใน httpOnly cookie (P4)
//
// ล็อกพฤติกรรมทั้งวงจร: login ฝัง cookie → refresh ด้วย cookie ล้วน
// → rotation เปลี่ยน cookie → ใช้ใบเก่าซ้ำ = โดน revoke ทั้ง chain
// → logout เคลียร์ cookie / และทางเก่า (body) ยังใช้ได้ช่วงเปลี่ยนผ่าน
// =============================================================

const unique = Date.now()
const EMAIL = `cookie-int-${unique}@test.local`
const PASSWORD = "Str0ngPass!234"

let userId: string

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      displayName: "Cookie Tester",
      isEmailVerified: true,
      passwordHash: { create: { passwordHash: await hashPassword(PASSWORD) } },
    },
  })
  userId = user.id
})

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  await prisma.$disconnect()
})

function login() {
  return request(app)
    .post("/api/v1/auth/login")
    .send({ email: EMAIL, password: PASSWORD })
}

// Set-Cookie เต็มๆ ของ refresh_token (มี attribute ครบ ไว้ assert)
function refreshSetCookie(res: request.Response): string | undefined {
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined
  return cookies?.find((c) => c.startsWith("refresh_token="))
}

// เฉพาะคู่ name=value (ไว้ส่งกลับใน Cookie header เหมือนเบราว์เซอร์)
function refreshCookiePair(res: request.Response): string {
  return refreshSetCookie(res)!.split(";")[0]
}

describe("Auth httpOnly refresh cookie (integration)", () => {
  it("login sets an httpOnly, path-scoped, SameSite=Lax refresh cookie (body still has tokens during transition)", async () => {
    const res = await login()

    expect(res.status).toBe(200)
    const cookie = refreshSetCookie(res)
    expect(cookie).toBeDefined()
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Path=/api/v1/auth")
    expect(cookie).toContain("SameSite=Lax")
    // ช่วงเปลี่ยนผ่าน: client รุ่นเดิมยังอ่าน token จาก body ได้
    expect(res.body.data.accessToken).toBeTruthy()
    expect(res.body.data.refreshToken).toBeTruthy()
  })

  it("refreshes with the cookie alone (empty body) and rotates the cookie", async () => {
    const first = await login()
    const cookie1 = refreshCookiePair(first)

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie1)
      .send({})

    expect(refreshed.status).toBe(200)
    expect(refreshed.body.data.accessToken).toBeTruthy()
    const cookie2 = refreshCookiePair(refreshed)
    expect(cookie2).toBeDefined()
    expect(cookie2).not.toBe(cookie1) // rotation ต้องได้ใบใหม่จริง
  })

  it("rejects reuse of a rotated cookie and revokes the whole chain (theft response)", async () => {
    const first = await login()
    const cookie1 = refreshCookiePair(first)

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie1)
      .send({})
    const cookie2 = refreshCookiePair(refreshed)

    // ใช้ใบเก่า (ถูก revoke ไปแล้วตอน rotate) = สัญญาณ token ถูกขโมย
    const reuse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie1)
      .send({})
    expect(reuse.status).toBe(401)

    // ผลของ theft response: แม้แต่ใบล่าสุด (cookie2) ก็ต้องตายไปด้วยทั้ง chain
    const afterTheft = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie2)
      .send({})
    expect(afterTheft.status).toBe(401)
  })

  it("still accepts the legacy body mode (no cookie) during the transition", async () => {
    const first = await login()
    const bodyToken = first.body.data.refreshToken as string

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: bodyToken })

    expect(refreshed.status).toBe(200)
    expect(refreshed.body.data.accessToken).toBeTruthy()
  })

  it("returns 401 when neither cookie nor body token is present", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({})
    expect(res.status).toBe(401)
  })

  it("logout revokes the token and clears the cookie (and is idempotent)", async () => {
    const first = await login()
    const cookie = refreshCookiePair(first)

    const out = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .send({})
    expect(out.status).toBe(200)
    // cookie ถูกเคลียร์ = Set-Cookie ค่าว่าง + วันหมดอายุในอดีต
    const cleared = refreshSetCookie(out)
    expect(cleared).toContain("refresh_token=;")
    expect(cleared).toContain("Expires=Thu, 01 Jan 1970")

    // token ที่ logout ไปแล้วต้องใช้ refresh ไม่ได้อีก
    const reuse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie)
      .send({})
    expect(reuse.status).toBe(401)

    // logout ซ้ำโดยไม่มี token = ยังจบสวย (idempotent)
    const again = await request(app).post("/api/v1/auth/logout").send({})
    expect(again.status).toBe(200)
  })
})
