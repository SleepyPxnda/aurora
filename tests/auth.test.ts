import { describe, expect, it } from 'vitest'
import { oidcConfigured, requireUser, sessionFromUser } from '../server/utils/auth'

const ok = {
  oauth: { oidc: { clientId: 'id', clientSecret: 'secret', openidConfig: 'https://idp.example/.well-known/openid-configuration' } },
  session: { password: 'x'.repeat(32) },
}
const status = (p: Promise<unknown>) => p.then(() => 0, (e) => e.statusCode)

describe('auth', () => {
  it('AC1: requireUser with an empty session throws 401', async () => {
    expect(await status(requireUser({}, async () => ({}), () => ok))).toBe(401)
  })

  it('AC2: requireUser returns the session sub', async () => {
    expect(await requireUser({}, async () => ({ user: { sub: 'sub-1' } }), () => ok)).toBe('sub-1')
  })

  it('AC5: the session holds exactly the sub, and only a non-empty string sub', () => {
    expect(sessionFromUser({ sub: 's', email: 'a@b.c', name: 'A' })).toEqual({ user: { sub: 's' } })
    expect(sessionFromUser({})).toBeNull()
    expect(sessionFromUser({ sub: '' })).toBeNull()
    expect(sessionFromUser({ sub: 42 })).toBeNull()
  })

  it('AC7: missing values, non-https URL and short password are not configured', async () => {
    expect(oidcConfigured(ok)).toBe(true)
    expect(oidcConfigured({ ...ok, oauth: { oidc: { ...ok.oauth.oidc, clientId: '' } } })).toBe(false)
    expect(oidcConfigured({ ...ok, oauth: { oidc: { ...ok.oauth.oidc, clientSecret: '' } } })).toBe(false)
    expect(oidcConfigured({ ...ok, oauth: { oidc: { ...ok.oauth.oidc, openidConfig: 'http://idp.example/x' } } })).toBe(false)
    expect(oidcConfigured({ ...ok, session: { password: 'short' } })).toBe(false)
    expect(oidcConfigured({ ...ok, oauth: { oidc: { ...ok.oauth.oidc, openidConfig: 'http://localhost:8080/x' } } }, true)).toBe(true)
    expect(await status(requireUser({}, async () => ({ user: { sub: 's' } }), () => ({})))).toBe(401)
  })
})
