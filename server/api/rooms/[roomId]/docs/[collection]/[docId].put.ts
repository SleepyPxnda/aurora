export default defineEventHandler((event) => withHttpErrors(async () => {
  const roomId = getRouterParam(event, 'roomId') ?? ''
  const collection = getRouterParam(event, 'collection') ?? ''
  const docId = getRouterParam(event, 'docId') ?? ''
  await roomStore().loadRoom(roomId)
  const text = await readLimitedBody(event.node.req)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = undefined
  }
  await roomStore().writeDoc(roomId, collection, docId, body)
  setResponseStatus(event, 204)
  return null
}))
