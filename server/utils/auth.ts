import { HttpError } from './room-store'

export interface AuthConfig {
  oauth?: { oidc?: { clientId?: string, clientSecret?: string, openidConfig?: string } }
  session?: { password?: string }
}
type LoadSession = (event: never) => Promise<{ user?: { sub?: unknown } | null }>

const SESSION_PASSWORD_MIN = 32

// All required values present and valid (AC7). Discovery URL: https, or http://localhost in dev.
export function oidcConfigured(config: AuthConfig, dev = import.meta.dev === true): boolean {
  const { clientId, clientSecret, openidConfig } = config.oauth?.oidc ?? {}
  if (!clientId || !clientSecret || !openidConfig) return false
  if ((config.session?.password ?? '').length < SESSION_PASSWORD_MIN) return false
  return openidConfig.startsWith('https://') || (dev && openidConfig.startsWith('http://localhost'))
}

// ASSUMPTION (AC5): `sub` comes from the userinfo response, not the ID token. The module decodes
// the ID token without checking signature, iss, aud or exp; userinfo is fetched over TLS with the
// access token from the back-channel code exchange. Nothing but `sub` goes into the session.
export function sessionFromUser(user: object): { user: { sub: string } } | null {
  const sub = (user as { sub?: unknown }).sub
  return typeof sub === 'string' && sub !== '' ? { user: { sub } } : null
}

// Returns the session `sub` or throws 401 (also when login is not configured).
export async function requireUser(
  event: unknown,
  loadSession: LoadSession = (e) => requireUserSession(e as never) as ReturnType<LoadSession>,
  config: () => AuthConfig = () => useRuntimeConfig() as AuthConfig,
): Promise<string> {
  if (!oidcConfigured(config())) throw new HttpError(401, 'Unauthorized')
  let sub: unknown
  try {
    sub = (await loadSession(event as never)).user?.sub
  } catch {
    throw new HttpError(401, 'Unauthorized')
  }
  if (typeof sub !== 'string' || sub === '') throw new HttpError(401, 'Unauthorized')
  return sub
}
