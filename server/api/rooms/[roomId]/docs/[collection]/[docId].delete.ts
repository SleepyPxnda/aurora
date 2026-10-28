export default defineEventHandler((event) => withHttpErrors(async () => {
  const roomId = getRouterParam(event, 'roomId') ?? ''
  const collection = getRouterParam(event, 'collection') ?? ''
  const docId = getRouterParam(event, 'docId') ?? ''
  await roomStore().deleteDoc(roomId, collection, docId)
  setResponseStatus(event, 204)
  return null
}))
