import { createAdminToken, createRoomId, isValidRoomId } from './room-ids'
import { hashToken } from './room-ids'

export const COLLECTIONS = ['review', 'claims', 'votes', 'goals', 'risks', 'notes'] as const
export const DOC_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
export const MAX_DOC_BYTES = 16 * 1024
export const MAX_DOCS_PER_ROOM = 2000

export interface RoomStorage {
  getItem: (key: string) => Promise<unknown>
  setItem: (key: string, value: unknown) => Promise<void>
  hasItem: (key: string) => Promise<boolean>
  removeItem: (key: string) => Promise<void>
  getKeys: (base?: string) => Promise<string[]>
}

interface RoomMeta {
  id: string
  adminTokenHash: string
  createdAt: string
}

export type RoomDocs = Record<string, Record<string, unknown>>

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

const NOT_FOUND = 'Not found'
const metaKey = (id: string) => `${id}:meta`
const docKey = (id: string, c: string, d: string) => `${id}:docs:${c}:${d}`

const isPlain = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype

function checkTarget(collection: string, docId: string) {
  if (!(COLLECTIONS as readonly string[]).includes(collection)) throw new HttpError(400, 'Invalid collection')
  if (!DOC_ID_PATTERN.test(docId)) throw new HttpError(400, 'Invalid docId')
}

function checkBody(body: unknown): asserts body is Record<string, unknown> {
  if (!isPlain(body)) throw new HttpError(400, 'Body must be an object')
}

// Plain objects merge recursively, everything else replaces.
function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (k === '__proto__') continue
    const cur = out[k]
    out[k] = isPlain(v) && isPlain(cur) ? deepMerge(cur, v) : v
  }
  return out
}

export function createRoomStore(storage: RoomStorage) {
  async function put(roomId: string, collection: string, docId: string, doc: Record<string, unknown>) {
    if (Buffer.byteLength(JSON.stringify(doc)) > MAX_DOC_BYTES) throw new HttpError(400, 'Document too large')
    const key = docKey(roomId, collection, docId)
    if (!(await storage.hasItem(key))) {
      const count = (await storage.getKeys(`${roomId}:docs:`)).length
      if (count >= MAX_DOCS_PER_ROOM) throw new HttpError(413, 'Too many documents')
    }
    await storage.setItem(key, doc)
  }

  async function assertRoom(roomId: string): Promise<RoomMeta> {
    if (!isValidRoomId(roomId)) throw new HttpError(404, NOT_FOUND)
    const meta = (await storage.getItem(metaKey(roomId))) as RoomMeta | null
    if (!meta) throw new HttpError(404, NOT_FOUND)
    return meta
  }

  return {
    async createRoom() {
      const roomId = createRoomId()
      const adminToken = createAdminToken()
      const meta: RoomMeta = { id: roomId, adminTokenHash: hashToken(adminToken), createdAt: new Date().toISOString() }
      await storage.setItem(metaKey(roomId), meta)
      return { roomId, adminToken }
    },

    // Internal use by requireAdmin only; never return this from an endpoint.
    async getAdminTokenHash(roomId: string) {
      return (await assertRoom(roomId)).adminTokenHash
    },

    async loadRoom(roomId: string) {
      await assertRoom(roomId)
      return { roomId }
    },

    async listDocs(roomId: string): Promise<RoomDocs> {
      await assertRoom(roomId)
      const prefix = `${roomId}:docs:`
      const keys = await storage.getKeys(prefix)
      const docs: RoomDocs = {}
      for (const key of keys) {
        const [collection, docId] = key.slice(prefix.length).split(':')
        if (!collection || !docId) continue
        ;(docs[collection] ??= {})[docId] = await storage.getItem(key)
      }
      return docs
    },

    async writeDoc(roomId: string, collection: string, docId: string, body: unknown) {
      await assertRoom(roomId)
      checkTarget(collection, docId)
      checkBody(body)
      await put(roomId, collection, docId, body)
    },

    async mergeDoc(roomId: string, collection: string, docId: string, body: unknown) {
      await assertRoom(roomId)
      checkTarget(collection, docId)
      checkBody(body)
      const existing = await storage.getItem(docKey(roomId, collection, docId))
      await put(roomId, collection, docId, deepMerge(isPlain(existing) ? existing : {}, body))
    },

    async deleteDoc(roomId: string, collection: string, docId: string) {
      await assertRoom(roomId)
      checkTarget(collection, docId)
      await storage.removeItem(docKey(roomId, collection, docId))
    },
  }
}

export const roomStore = () => createRoomStore(useStorage('rooms') as unknown as RoomStorage)

// Maps store errors to h3 errors (endpoints only; uses Nitro auto-imports).
export async function withHttpErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof HttpError) throw createError({ statusCode: e.statusCode, statusMessage: e.message })
    throw e
  }
}
