import type { RoomStorage } from '../server/utils/room-store'

export function fakeStorage(map = new Map<string, unknown>()): RoomStorage & { map: Map<string, unknown> } {
  return {
    map,
    getItem: async (k) => map.get(k) ?? null,
    setItem: async (k, v) => { map.set(k, JSON.parse(JSON.stringify(v))) },
    hasItem: async (k) => map.has(k),
    getKeys: async (base = '') => [...map.keys()].filter((k) => k.startsWith(base)),
  }
}
