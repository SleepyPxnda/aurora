import { describe, expect, it } from 'vitest'
import { createRoomStore, MAX_DOCS_PER_ROOM } from '../server/utils/room-store'
import { fakeStorage } from './helpers'

async function setup() {
  const st = fakeStorage()
  const store = createRoomStore(st)
  const { roomId, adminToken } = await store.createRoom()
  return { st, store, roomId, adminToken }
}
const status = (p: Promise<unknown>) => p.then(() => 0, (e) => e.statusCode)

describe('room store', () => {
  it('AC3: stores a 64-hex hash, not the token; reads expose no hash', async () => {
    const { st, store, roomId, adminToken } = await setup()
    const meta = st.map.get(`${roomId}:meta`) as { adminTokenHash: string }
    expect(meta.adminTokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify([...st.map.values()])).not.toContain(adminToken)
    expect(JSON.stringify(await store.loadRoom(roomId))).not.toContain(meta.adminTokenHash)
    expect(JSON.stringify(await store.listDocs(roomId))).not.toContain(meta.adminTokenHash)
  })

  it('AC4: a second store over the same map reads the room', async () => {
    const { st, roomId, store } = await setup()
    await store.writeDoc(roomId, 'review', 'main', { system: 'x' })
    const second = createRoomStore(fakeStorage(st.map))
    expect((await second.listDocs(roomId)).review?.main).toEqual({ system: 'x' })
  })

  it('AC5: one key per document, none for the whole state', async () => {
    const { st, store, roomId } = await setup()
    await store.writeDoc(roomId, 'votes', 'a', { v: 1 })
    await store.writeDoc(roomId, 'votes', 'b', { v: 2 })
    expect([...st.map.keys()].sort()).toEqual([`${roomId}:docs:votes:a`, `${roomId}:docs:votes:b`, `${roomId}:meta`].sort())
  })

  it('AC7: metadata keys are exact and documents are stored unchanged', async () => {
    const { st, store, roomId } = await setup()
    const body = { system: 'x' }
    await store.writeDoc(roomId, 'review', 'main', body)
    expect(Object.keys(st.map.get(`${roomId}:meta`) as object).sort()).toEqual(['adminTokenHash', 'createdAt', 'id'])
    expect(st.map.get(`${roomId}:docs:review:main`)).toEqual(body)
  })

  it('AC8: list groups documents by collection and docId', async () => {
    const { store, roomId } = await setup()
    await store.writeDoc(roomId, 'votes', 'a', { v: 1 })
    await store.writeDoc(roomId, 'goals', 'g', { t: 'y' })
    expect(await store.listDocs(roomId)).toEqual({ votes: { a: { v: 1 } }, goals: { g: { t: 'y' } } })
  })

  it('AC9: last writer wins per doc, others untouched', async () => {
    const { store, roomId } = await setup()
    await store.writeDoc(roomId, 'votes', 'a', { v: 1 })
    await store.writeDoc(roomId, 'votes', 'b', { v: 2 })
    await store.writeDoc(roomId, 'votes', 'a', { v: 3 })
    expect((await store.listDocs(roomId)).votes).toEqual({ a: { v: 3 }, b: { v: 2 } })
  })

  it('AC9: invalid writes give 400 and store nothing', async () => {
    const { st, store, roomId } = await setup()
    const before = st.map.size
    expect(await status(store.writeDoc(roomId, 'nope', 'a', {}))).toBe(400)
    expect(await status(store.writeDoc(roomId, 'votes', 'bad id', {}))).toBe(400)
    expect(await status(store.writeDoc(roomId, 'votes', 'a', []))).toBe(400)
    expect(await status(store.writeDoc(roomId, 'votes', 'a', 'str'))).toBe(400)
    expect(await status(store.writeDoc(roomId, 'votes', 'a', { big: 'x'.repeat(16 * 1024) }))).toBe(400)
    expect(st.map.size).toBe(before)
  })

  it('AC9: the 2001st document gives 413, overwriting still works', async () => {
    const { st, store, roomId } = await setup()
    for (let i = 0; i < MAX_DOCS_PER_ROOM; i++) st.map.set(`${roomId}:docs:notes:n${i}`, {})
    expect(await status(store.writeDoc(roomId, 'notes', 'extra', {}))).toBe(413)
    expect(await status(store.writeDoc(roomId, 'notes', 'n0', { a: 1 }))).toBe(0)
  })

  it('AC13: unknown and malformed ids give the same 404', async () => {
    const { store } = await setup()
    const err = async (p: Promise<unknown>) => p.catch((e) => e)
    const a = await err(store.loadRoom('A'.repeat(22)))
    const b = await err(store.listDocs('bad id!'))
    expect(a.statusCode).toBe(404)
    expect(b.statusCode).toBe(404)
    expect(a.message).toBe(b.message)
  })
})
