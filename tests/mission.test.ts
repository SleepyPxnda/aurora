import { describe, expect, it } from 'vitest'
import {
  activeVotes, countVotes, createDocId, listClaims, MSCHECK_QUESTIONS, remainingVotes, topClaimIds, validateClaim,
  VOTES_PER_PERSON,
  type Claim,
} from '../app/lib/mission'
import { DOC_ID_PATTERN } from '../server/utils/room-store'

const claim = (id: string, at = '2026-01-01T00:00:00Z'): Claim => ({ id, text: id, at })
const votes = (...ids: string[]) => Object.fromEntries(ids.map((c, i) => [`v${i}`, { claimId: c }]))

describe('mission logic', () => {
  it('AC4: claim validation trims and enforces 1 to 140 characters', () => {
    expect(validateClaim('  hi ')).toBe('hi')
    expect(validateClaim('   ')).toBeNull()
    expect(validateClaim('a'.repeat(140))).toBe('a'.repeat(140))
    expect(validateClaim('a'.repeat(141))).toBeNull()
  })

  it('AC4: random doc id matches the pattern and has at least 22 characters', () => {
    const id = createDocId()
    expect(id).toMatch(DOC_ID_PATTERN)
    expect(id.length).toBeGreaterThanOrEqual(22)
    expect(createDocId()).not.toBe(id)
  })

  it('AC4: claims are ordered by at, then docId', () => {
    const out = listClaims({ b: { text: 'x', at: '2' }, c: { text: 'x', at: '1' }, a: { text: 'x', at: '2' } })
    expect(out.map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })

  it('AC7: active votes ignore missing and orphaned own votes; remaining reaches 0', () => {
    const claims = [claim('a'), claim('b'), claim('c')]
    const v = { v1: { claimId: 'a' }, v2: { claimId: 'gone' }, v3: { claimId: 'b' }, v4: { claimId: 'c' } }
    const active = activeVotes(['v1', 'v2', 'v3', 'missing', 'v4'], claims, v)
    expect(active.map((x) => x.voteId)).toEqual(['v1', 'v3', 'v4'])
    expect(remainingVotes(active)).toBe(0)
    expect(remainingVotes(active.slice(0, 1))).toBe(VOTES_PER_PERSON - 1)
  })

  it('AC8: counts leave out orphaned votes', () => {
    expect(countVotes([claim('a'), claim('b')], votes('a', 'a', 'gone', 'b'))).toEqual({ a: 2, b: 1 })
  })

  it('AC9: top claims with fewer than 4 voted, ties at place 4, 0 votes excluded', () => {
    expect([...topClaimIds({ a: 2, b: 1, c: 0 })].sort()).toEqual(['a', 'b'])
    expect([...topClaimIds({ a: 5, b: 4, c: 3, d: 2, e: 2, f: 2, g: 1 })].sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(topClaimIds({ a: 0 }).size).toBe(0)
  })

  it('AC11: exactly 7 questions with keys q1 to q7', () => {
    expect(MSCHECK_QUESTIONS.map((q) => q.key)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'])
  })
})
