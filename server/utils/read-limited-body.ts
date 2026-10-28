import type { IncomingMessage } from 'node:http'
import { HttpError, MAX_DOC_BYTES } from './room-store'

// Small margin over the document limit for JSON whitespace; exact size is checked by the store.
export const MAX_BODY_BYTES = MAX_DOC_BYTES + 1024

export async function readLimitedBody(req: IncomingMessage, max = MAX_BODY_BYTES): Promise<string> {
  const declared = Number(req.headers['content-length'])
  if (declared > max) throw new HttpError(413, 'Body too large')
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > max) {
      req.destroy()
      throw new HttpError(413, 'Body too large')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}
