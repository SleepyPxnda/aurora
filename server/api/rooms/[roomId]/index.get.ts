export default defineEventHandler((event) => withHttpErrors(async () => {
  const roomId = getRouterParam(event, 'roomId') ?? ''
  const store = roomStore()
  await store.loadRoom(roomId)
  return { roomId, docs: await store.listDocs(roomId) }
}))
