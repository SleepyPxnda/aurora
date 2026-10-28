import { verifyToken } from './room-ids'
import { HttpError, roomStore } from './room-store'

export interface AdminEvent {
  node: { req: { headers: Record<string, string | string[] | undefined> } }
}

export async function requireAdmin(
  event: AdminEvent,
  roomId: string,
  loadHash: (id: string) => Promise<string> = (id) => roomStore().getAdminTokenHash(id),
) {
  const raw = event.node.req.headers['x-admin-token']
  const token = Array.isArray(raw) ? raw[0] : raw
  const hash = await loadHash(roomId)
  if (!token || !verifyToken(token, hash)) throw new HttpError(403, 'Forbidden')
}
