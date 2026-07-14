# Deployment & Observability

## TL;DR

```bash
# build + run ในคอนเทนเนอร์ — docker-compose อยู่ที่ ../infra (นอก repo นี้
# เพราะเป็นเครื่องมือรัน local ของทั้งระบบ ไม่ใช่ของ backend อย่างเดียว)
cd ../infra && docker compose --profile app up --build

# หรือ build image ตรงๆ จาก repo นี้
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

## Migrations

image ของแอป (runner) **ไม่มี** Prisma CLI (เป็น devDependency) จึงไม่ migrate เอง

**เคสนี้ใช้ Neon DB ตัวเดิมเป็น production** → schema ถูก apply ครบแล้วจากตอน dev
(`migrate dev`) ดังนั้น **deploy ครั้งแรกไม่ต้องรัน migration**

**เมื่อแก้ schema ในอนาคต** → รัน migrate จากเครื่อง dev ก่อน push:

```bash
# apply migration ที่มีอยู่กับ production DB (ไม่สร้างใหม่/ไม่ลบข้อมูล)
npx prisma migrate deploy
```

> ถ้าวันหน้าแยก DB prod ออกจาก dev ค่อยทำ migrate ให้อัตโนมัติตอน deploy
> (ย้าย `prisma` เป็น dependency + ใส่ release command) — ตอนนี้ยังไม่จำเป็น

---

## Production deploy — Railway (API) + Vercel (web) + domain

สถาปัตยกรรมเป้าหมาย:

```
app.tanadon-t.com (Vercel · web)  ──API──►  api.tanadon-t.com (Railway · API)  ──►  Neon (DB)
```

### A. Backend → Railway

1. **New Project → Deploy from GitHub** เลือก repo `Bootstrapper` → Railway เจอ
   `Dockerfile` + `railway.toml` build เอง (health check `/health` ตั้งไว้แล้ว)
2. ตั้ง **Deploy branch = `main`** (Settings → ไม่ให้ `dev` ไป prod)
3. ตั้ง **Variables** (เอาจาก [.env.example](.env.example) — ห้าม commit ค่าจริง):
   - `NODE_ENV=production`
   - `DATABASE_URL` = Neon **pooler** URL
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` = ค่าใหม่สำหรับ prod (สร้างด้วย
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `ALLOWED_ORIGIN=https://app.tanadon-t.com`
   - `FRONTEND_URL=https://app.tanadon-t.com`
   - `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
   - `GOOGLE_CALLBACK_URL=https://api.tanadon-t.com/api/v1/auth/google/callback`
   - `GITHUB_CALLBACK_URL=https://api.tanadon-t.com/api/v1/auth/github/callback`
   - `SENTRY_DSN` (ถ้าต่อ Sentry แล้ว)
4. **Settings → Networking → Custom Domain** → `api.tanadon-t.com`
   Railway จะให้ค่า CNAME → เอาไปใส่ใน DNS (ข้อ C)

### B. Frontend → Vercel

1. **Add New Project** เลือก repo `Bootstrapper-Client` → Vercel เจอ Vite เอง
   (มี `vercel.json` คุม SPA routing แล้ว)
2. **Production Branch = `main`**
3. **Environment Variables**: `VITE_API_URL=https://api.tanadon-t.com`
   > Vite ฝัง env ตอน **build** → ต้องตั้งก่อน deploy
4. **Settings → Domains** → `app.tanadon-t.com`

### C. DNS (ที่ผู้ให้บริการ domain ของคุณ)

เพิ่ม 2 CNAME records (ค่าปลายทางเอาจาก Railway/Vercel ในข้อ A4/B4):

| Host | Type | ชี้ไป |
|------|------|------|
| `api` | CNAME | (ค่าที่ Railway ให้) |
| `app` | CNAME | (ค่าที่ Vercel ให้ มักเป็น `cname.vercel-dns.com`) |

### D. Google / GitHub OAuth Console

- **Google Cloud Console** → Credentials → OAuth client → **Authorized redirect URIs**
  เพิ่ม `https://api.tanadon-t.com/api/v1/auth/google/callback`
- **GitHub** → OAuth App → **Authorization callback URL**
  ตั้ง `https://api.tanadon-t.com/api/v1/auth/github/callback`

### ลำดับที่ปลอดภัย

1. เชื่อม Railway + Vercel (branch = main) + ตั้ง env + custom domain
2. ตั้ง DNS + OAuth callback
3. เปิด **Branch Protection** ที่ `main` (require CI ผ่านก่อน merge)
4. merge `dev` → `main` → ทั้งสอง platform deploy prod อัตโนมัติ
5. ทดสอบ: เปิด `https://app.tanadon-t.com` → สมัคร/login (รวม Google)

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
