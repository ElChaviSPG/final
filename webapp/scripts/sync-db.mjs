/**
 * Aplica columnas/tablas faltantes con una sola conexión (útil cuando el pool de Aiven está lleno).
 * Uso: node scripts/sync-db.mjs
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

function databaseUrlWithLimit() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no definida en .env')
  if (url.includes('connection_limit')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}connection_limit=1`
}

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrlWithLimit() } },
})

const statements = [
  `CREATE TABLE IF NOT EXISTS "configuracion_division" (
    "id" SERIAL NOT NULL,
    "laboratorio_id" INTEGER NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "cupo" INTEGER NOT NULL,
    "es_grupo_completo" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "configuracion_division_pkey" PRIMARY KEY ("id")
  )`,

  `ALTER TABLE "laboratorio" ADD COLUMN IF NOT EXISTS "codigo" TEXT`,
  `ALTER TABLE "laboratorio" ADD COLUMN IF NOT EXISTS "tipo" TEXT DEFAULT 'COMPUTACION'`,
  `ALTER TABLE "laboratorio" ADD COLUMN IF NOT EXISTS "capacidad_total" INTEGER DEFAULT 30`,
  `ALTER TABLE "laboratorio" ADD COLUMN IF NOT EXISTS "permite_division" BOOLEAN DEFAULT true`,
  `ALTER TABLE "laboratorio" ADD COLUMN IF NOT EXISTS "fase_implementacion" INTEGER DEFAULT 1`,
  `ALTER TABLE "laboratorio" ADD COLUMN IF NOT EXISTS "disponible_publico" BOOLEAN DEFAULT true`,

  `ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "es_servidor" BOOLEAN DEFAULT false`,
  `ALTER TABLE "equipo" ADD COLUMN IF NOT EXISTS "ubicacion_fisica" TEXT`,

  `ALTER TABLE "reserva" ADD COLUMN IF NOT EXISTS "configuracion_division_id" INTEGER`,
  `ALTER TABLE "reserva" ADD COLUMN IF NOT EXISTS "aprobada_por_id" TEXT`,
  `ALTER TABLE "reserva" ADD COLUMN IF NOT EXISTS "motivo_rechazo" TEXT`,
  `ALTER TABLE "reserva" ADD COLUMN IF NOT EXISTS "motivo_cancelacion" TEXT`,
  `ALTER TABLE "reserva" ADD COLUMN IF NOT EXISTS "notas" TEXT`,
]

async function main() {
  console.log('Sincronizando schema (1 conexión)...')
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql)
    console.log('  OK:', sql.slice(0, 60).replace(/\s+/g, ' ') + '...')
  }
  console.log('Listo. Ejecuta: npm run db:generate && npm run db:seed (opcional)')
}

main()
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
