export default defineEventHandler((event) => withHttpErrors(async () => {
  await requireAdmin(event, getRouterParam(event, 'roomId') ?? '')
  setResponseStatus(event, 204)
  return null
}))
