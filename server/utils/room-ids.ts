import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const BYTES = 16 // 128 bits
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{22,64}$/

export const createRoomId = (): string => randomBytes(BYTES).toString('base64url')
export const createAdminToken = (): string => randomBytes(BYTES).toString('base64url')
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex')
export const isValidRoomId = (id: string): boolean => ROOM_ID_PATTERN.test(id)

export function verifyToken(token: string, storedHash: string): boolean {
  if (!token) return false
  const a = Buffer.from(hashToken(token), 'hex')
  const b = Buffer.from(storedHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}
