# =============================================================
# Multi-stage build
# - builder: ติดตั้ง dep ครบ → prisma generate → compile TS เป็น JS
# - runner : เอาเฉพาะของที่ต้องใช้ตอนรัน (เล็ก + ไม่มี dev tools)
# แยกแบบนี้เพื่อให้ image สุดท้ายเล็กและปลอดภัย (ไม่มี source/devDeps ติดไป)
# =============================================================

# ---------- Stage 1: builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

# คัดลอกแค่ manifest ก่อน → ใช้ layer cache: ถ้า dep ไม่เปลี่ยน ไม่ต้อง npm ci ใหม่
COPY package*.json ./
RUN npm ci

# คัดลอก source ที่เหลือ (ตาม .dockerignore)
COPY . .

# สร้าง Prisma Client (ออกไปที่ generated/prisma) แล้ว compile
RUN npx prisma generate
RUN npm run build

# ---------- Stage 2: runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# ติดตั้งเฉพาะ production dependencies (ไม่เอา devDeps เช่น typescript, vitest)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ของที่ต้องมีตอนรัน:
#  - dist/        : โค้ดที่ compile แล้ว
#  - generated/   : Prisma Client (@generated/prisma resolve มาที่นี่ผ่าน tsconfig-paths)
#  - tsconfig.json: ให้ tsconfig-paths อ่าน paths/baseUrl ตอน start
#  - prisma/      : schema + migrations (ไว้รัน migrate deploy ตอน release)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma ./prisma

# รันเป็น non-root user (ติดมากับ image node อยู่แล้ว) เพื่อความปลอดภัย
USER node

EXPOSE 3000

# healthcheck ให้ Docker/platform รู้ว่า container ยัง "มีชีวิต"
# อ่าน PORT จาก env (Railway/host inject port เอง อาจไม่ใช่ 3000) — กัน healthcheck เช็คผิด port
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;fetch('http://localhost:'+p+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# start = node -r tsconfig-paths/register dist/main.js (ดู package.json)
CMD ["npm", "start"]
