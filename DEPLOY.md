# Deployment & Observability

## TL;DR

```bash
# build + run ในคอนเทนเนอร์ (อ่านค่าจาก .env)
docker compose up --build

# หรือ build image ตรงๆ
docker build -t bootstrapper-api .
docker run --env-file .env -p 3000:3000 bootstrapper-api
```

แอปจะฟังที่ `http://localhost:3000` — เช็คสุขภาพที่ `GET /health`

---

## Docker image

ใช้ **multi-stage build** ([Dockerfile](Dockerfile)):

| Stage | ทำอะไร |
|-------|--------|
| `builder` | `npm ci` (dep ครบ) → `prisma generate` → `npm run build` (TS→JS) |
| `runner` | `npm ci --omit=dev` แล้วก๊อปเฉพาะ `dist/`, `generated/`, `tsconfig.json`, `prisma/` |

ทำไม image สุดท้ายต้องมี `tsconfig.json` + `generated/`? เพราะ start ใช้
`node -r tsconfig-paths/register` เพื่อ resolve `@generated/prisma` → `generated/prisma`
ตอน runtime (alias นี้ตัวเดียวที่ไม่ได้ถูก compile เป็น relative path)

รันเป็น **non-root user** (`USER node`) — ถ้าถูกเจาะ ผู้โจมตีไม่ได้สิทธิ์ root ในคอนเทนเนอร์

---

## Migrations (สำคัญ — แยกจากการรันแอป)

image ของแอป (runner) **ไม่มี** Prisma CLI (เป็น devDependency) จึงไม่ migrate เอง
ให้รัน migration เป็น **ขั้นตอน release แยก** ก่อนสตาร์ทเวอร์ชันใหม่:

```bash
# รันจากเครื่อง dev หรือ CI ที่มี prisma + เห็น DATABASE_URL ของ production
npx prisma migrate deploy
```

> `migrate deploy` ใช้กับ production (apply migration ที่มีอยู่เท่านั้น ไม่สร้างใหม่/ไม่ลบข้อมูล)
> ต่างจาก `migrate dev` ที่ใช้ตอนพัฒนา

---

## Deploy ขึ้น platform (แนะนำ Railway / Render / Fly.io)

ขั้นตอนเหมือนกันทุกเจ้า:

1. เชื่อม GitHub repo → platform ตรวจเจอ `Dockerfile` แล้ว build เอง
2. ตั้ง **environment variables** ใน dashboard (ดูรายการใน [.env.example](.env.example)) —
   **อย่าหาทำาา** commit `.env` จริงเข้า repo
3. ตั้ง health check path = `/health`
4. ใส่ release command (ก่อน start): `npx prisma migrate deploy`
5. `DATABASE_URL` ชี้ไป Neon (pooler URL), `NODE_ENV=production`

หลัง deploy จะได้ public URL ให้กดเล่นได้จริง

---

## Observability — "log อยู่ที่ไหน? server ล่มแล้วดูยังไง?"

### หลักการ: แอปแค่ "พ่น" log ออก stdout — ไม่เก็บเอง

แอปนี้ใช้ **Pino** เขียน JSON log ออก `stdout` (ไม่เขียนไฟล์ ไม่เขียน DB)
ตามหลัก [12-Factor](https://12factor.net/logs): *treat logs as event streams*

**ทำไมไม่เก็บ log ใน DB?**
- DB ล่ม = log หายตอนที่ต้องใช้ debug ที่สุด
- เพิ่ม write load ทุก request
- log เป็น append-only ปริมาณมหาศาล — DB ผิดประเภท

### ใครเก็บ → ระบบที่รันแอปดักจาก stdout แล้วส่งออกนอกเครื่อง

| ระดับ | ดู log จากไหน | รอดตอน server ล่มไหม |
|-------|--------------|----------------------|
| Docker | `docker logs <container>` | ✅ (คนละ process กับแอป) |
| Platform (Railway/Render/Fly) | dashboard → Logs | ✅ ส่งออกแล้วเก็บฝั่ง platform |
| Production จริง | log drain → Better Stack / Axiom / Grafana Loki / Datadog | ✅ stream ออกทันทีที่เกิด |

**กุญแจ:** log ถูกส่งออกนอกเครื่องแบบ near-real-time → แม้ server ตาย
log ที่ส่งไปแล้ว (รวม error สุดท้ายก่อนตาย) ยังอยู่ในตัวเก็บภายนอก

### Log ≠ Error tracking (ต้องมีทั้งคู่)

- **Log** (Pino → stdout) = สายธารเหตุการณ์ทั้งหมด
- **Error tracking** (Sentry) = ดักเฉพาะ exception + stack trace + จัดกลุ่ม + แจ้งเตือน

### setup ระดับ "ใช้จริง" แบบไม่เสียเงิน (next step)

1. Deploy → platform เก็บ stdout ให้อัตโนมัติ (มีแล้วทันทีที่ deploy)
2. ต่อ **log drain** ไป Better Stack / Axiom (free tier) → ค้นหา/เก็บยาว/ตั้ง alert
3. เพิ่ม **Sentry** (free tier) ดัก exception

### สิ่งที่ logging ของโปรเจคนี้ทำถูกแล้ว

- JSON ใน production, pretty ใน dev ([logger.ts](src/shared/logging/logger.ts))
- ทุก log มี **correlationId** → ตามรอย 1 request ข้ามหลาย log ได้
- **ไม่ log request body / Authorization header** + `redact` ข้อมูลอ่อนไหว (กัน token หลุด)
- `base: { service, env }` → filter ใน aggregator ได้เวลาหลายแอปส่งที่เดียวกัน
