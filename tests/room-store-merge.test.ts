import { describe, expect, it } from 'vitest'
import { createRoomStore, MAX_DOCS_PER_ROOM } from '../server/utils/room-store'
import { fakeStorage } from './helpers'

async function setup() {
  const st = fakeStorage()
  const store = createRoomStore(st)
  const { roomId } = await store.createRoom()
  return { st, store, roomId }
}
const status = (p: Promise<unknown>) => p.then(() => 0, (e) => e.statusCode)

describe('merge and delete', () => {
  it('AC1: merge keeps other keys, merges objects recursively, creates missing docs', async () => {
    const { store, roomId } = await setup()
    await store.mergeDoc(roomId, 'review', 'main', { system: 'a', mscheck: { q1: true } })
    await store.mergeDoc(roomId, 'review', 'main', { inScope: 'x', mscheck: { q2: false }, list: [1] })
    await store.mergeDoc(roomId, 'review', 'main', { list: [2] })
    expect((await store.listDocs(roomId)).review?.main).toEqual({
      system: 'a', inScope: 'x', mscheck: { q1: true, q2: false }, list: [2],
    })
  })

  it('AC1: oversized merged result gives 400 and writes nothing; 2001st doc gives 413', async () => {
    const { st, store, roomId } = await setup()
    await store.mergeDoc(roomId, 'review', 'main', { a: 'x'.repeat(9000) })
    expect(await status(store.mergeDoc(roomId, 'review', 'main', { b: 'x'.repeat(9000) }))).toBe(400)
    expect(st.map.get(`${roomId}:docs:review:main`)).toEqual({ a: 'x'.repeat(9000) })
    for (let i = 0; i < MAX_DOCS_PER_ROOM; i++) st.map.set(`${roomId}:docs:notes:n${i}`, {})
    expect(await status(store.mergeDoc(roomId, 'notes', 'extra', { a: 1 }))).toBe(413)
    expect(await status(store.mergeDoc('A'.repeat(22), 'notes', 'n0', {}))).toBe(404)
  })

  it('AC2: delete removes exactly one key; missing resolves; invalid gives 400/404', async () => {
    const { st, store, roomId } = await setup()
    await store.writeDoc(roomId, 'votes', 'a', { claimId: 'c' })
    await store.writeDoc(roomId, 'votes', 'b', { claimId: 'c' })
    await store.deleteDoc(roomId, 'votes', 'a')
    expect([...st.map.keys()].filter((k) => k.includes(':docs:'))).toEqual([`${roomId}:docs:votes:b`])
    expect(await status(store.deleteDoc(roomId, 'votes', 'missing'))).toBe(0)
    expect(await status(store.deleteDoc(roomId, 'nope', 'a'))).toBe(400)
    expect(await status(store.deleteDoc(roomId, 'votes', 'bad id'))).toBe(400)
    expect(await status(store.deleteDoc('A'.repeat(22), 'votes', 'a'))).toBe(404)
  })
})
