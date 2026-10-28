const failed = (event: Parameters<typeof sendRedirect>[0]) => sendRedirect(event, '/?login=failed')

const handler = defineOAuthOidcEventHandler({
  async onSuccess(event, { user }) {
    const session = sessionFromUser(user)
    if (!session) return failed(event)
    await replaceUserSession(event, session)
    return sendRedirect(event, '/')
  },
  onError: (event) => failed(event),
})

export default defineEventHandler(async (event) => {
  if (!oidcConfigured(useRuntimeConfig(event) as AuthConfig)) {
    throw createError({ statusCode: 503, statusMessage: 'Login not configured' })
  }
  try {
    return await handler(event)
  } catch {
    return failed(event)
  }
})
