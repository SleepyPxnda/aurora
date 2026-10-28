// ASSUMPTION (LASR leaves these open): votes per person, size of the top group,
// one vote per claim per display name, and the tie rule (all claims that reach the
// vote count of the claim in last top place are top claims, 0 votes never).
export const VOTES_PER_PERSON = 3
export const TOP_GROUP_SIZE = 4
export const CLAIM_MAX_LENGTH = 140

// ADAPTATION of the LASR mission statement check, own wording (CC BY-SA 4.0).
export const MSCHECK_QUESTIONS = [
  { key: 'q1', text: 'Lässt sich der Zweck des Systems in einem Satz sagen?' },
  { key: 'q2', text: 'Ist klar, wer das System nutzt?' },
  { key: 'q3', text: 'Ist klar, welchen Nutzen es diesen Menschen bringt?' },
  { key: 'q4', text: 'Ist klar, was zum System gehört und was nicht?' },
  { key: 'q5', text: 'Stehen die wichtigsten Claims fest?' },
  { key: 'q6', text: 'Verstehen Menschen außerhalb des Teams die Claims?' },
  { key: 'q7', text: 'Trägt das ganze Team das Mission Statement mit?' },
] as const

// ASSUMPTION: "own" means the same display name, trimmed and case-insensitive.
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export interface Claim { id: string, text: string, at: string, author?: string }
export type VoteDocs = Record<string, { claimId?: unknown, author?: unknown }>

export const isOwnClaim = (name: string, claim: Claim) => claim.author !== undefined && sameName(claim.author, name)

export function createDocId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function validateClaim(input: string): string | null {
  const text = input.trim()
  return text.length >= 1 && text.length <= CLAIM_MAX_LENGTH ? text : null
}

export function listClaims(docs: Record<string, { text?: unknown, at?: unknown, author?: unknown }> = {}): Claim[] {
  return Object.entries(docs)
    .map(([id, d]) => ({ id, text: String(d.text ?? ''), at: String(d.at ?? ''), author: typeof d.author === 'string' ? d.author : undefined }))
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

export function countVotes(claims: Claim[], votes: VoteDocs = {}): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(claims.map((c) => [c.id, 0]))
  for (const v of Object.values(votes)) {
    if (typeof v.claimId === 'string' && v.claimId in counts) counts[v.claimId]!++
  }
  return counts
}

// Votes of this name that point to an existing claim. Votes without author belong to no one.
export function activeVotes(name: string, claims: Claim[], votes: VoteDocs = {}): { voteId: string, claimId: string }[] {
  const ids = new Set(claims.map((c) => c.id))
  return Object.entries(votes).flatMap(([voteId, v]) =>
    typeof v.author === 'string' && sameName(v.author, name) && typeof v.claimId === 'string' && ids.has(v.claimId)
      ? [{ voteId, claimId: v.claimId }]
      : [])
}

export const remainingVotes = (active: unknown[]) => Math.max(0, VOTES_PER_PERSON - active.length)

export function topClaimIds(counts: Record<string, number>): Set<string> {
  const voted = Object.entries(counts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  if (!voted.length) return new Set()
  const threshold = voted[Math.min(TOP_GROUP_SIZE, voted.length) - 1]![1]
  return new Set(voted.filter(([, n]) => n >= threshold).map(([id]) => id))
}
