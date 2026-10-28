export default defineEventHandler((event) => withHttpErrors(async () => {
  const roomId = getRouterParam(event, 'roomId') ?? ''
  const collection = getRouterParam(event, 'collection') ?? ''
  const docId = getRouterParam(event, 'docId') ?? ''
  const text = (await readRawBody(event, 'utf8')) ?? ''
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
