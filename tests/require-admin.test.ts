import { describe, expect, it } from 'vitest'
import { hashToken } from '../server/utils/room-ids'
import { requireAdmin } from '../server/utils/require-admin'

const ev = (headers: Record<string, string> = {}) => ({ node: { req: { headers } } })
const load = async () => hashToken('right')
const status = (p: Promise<unknown>) => p.then(() => 0, (e) => e.statusCode)

describe('requireAdmin', () => {
  it('AC11: 403 without header, 403 with wrong token, passes with right token', async () => {
    expect(await status(requireAdmin(ev(), 'r', load))).toBe(403)
    expect(await status(requireAdmin(ev({ 'x-admin-token': 'wrong' }), 'r', load))).toBe(403)
    expect(await status(requireAdmin(ev({ 'x-admin-token': 'right' }), 'r', load))).toBe(0)
  })
})
