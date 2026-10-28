import { describe, expect, it } from 'vitest'
import { createAdminToken, createRoomId, hashToken, verifyToken } from '../server/utils/room-ids'

describe('room ids', () => {
  it('AC2: id and token are 128 bit base64url, unique and unrelated', () => {
    const id = createRoomId()
    const token = createAdminToken()
    expect(id).toMatch(/^[A-Za-z0-9_-]{22,}$/)
    expect(token).toMatch(/^[A-Za-z0-9_-]{22,}$/)
    expect(createRoomId()).not.toBe(id)
    expect(token).not.toBe(id)
    expect(token).not.toContain(id)
  })

  it('AC3: verify accepts right token, rejects wrong, empty and different length', () => {
    const hash = hashToken('secret-token')
    expect(verifyToken('secret-token', hash)).toBe(true)
    expect(verifyToken('other-token!', hash)).toBe(false)
    expect(verifyToken('', hash)).toBe(false)
    expect(verifyToken('x', hash)).toBe(false)
  })
})
