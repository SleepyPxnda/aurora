import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { readLimitedBody } from '../server/utils/read-limited-body'

const req = (body: string, headers: Record<string, string> = {}) =>
  Object.assign(Readable.from([Buffer.from(body)]), { headers }) as never
const status = (p: Promise<unknown>) => p.then(() => 0, (e) => e.statusCode)

describe('readLimitedBody', () => {
  it('AC5: reads a body within the cap', async () => {
    expect(await readLimitedBody(req('{"a":1}'), 100)).toBe('{"a":1}')
  })
  it('AC5: rejects early on a large content-length', async () => {
    expect(await status(readLimitedBody(req('x', { 'content-length': '101' }), 100))).toBe(413)
  })
  it('AC5: aborts a stream over the cap without content-length', async () => {
    expect(await status(readLimitedBody(req('x'.repeat(101)), 100))).toBe(413)
  })
})
