/** Serializa datos de Prisma para Client Components (Decimal, Date). */
export function serialize(data) {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (value !== null && typeof value === 'object' && typeof value.toJSON === 'function') {
        return value.toJSON()
      }
      return value
    })
  )
}
