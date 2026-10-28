export default defineEventHandler((event) => withHttpErrors(async () => {
  const sub = await requireUser(event)
  return roomStore().createRoom(sub)
}))
