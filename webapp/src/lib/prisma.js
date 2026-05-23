import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url || url.includes('connection_limit')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}connection_limit=5`
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? { db: { url: getDatabaseUrl() } }
      : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
