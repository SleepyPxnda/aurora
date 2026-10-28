import { describe, expect, it } from 'vitest'
import { parseOwnDocs } from '../app/composables/useOwnDocs'

describe('own docs', () => {
  it('AC10: accepts a valid value, falls back to empty lists otherwise', () => {
    expect(parseOwnDocs('{"claims":["a"],"votes":["b"]}')).toEqual({ claims: ['a'], votes: ['b'] })
    const empty = { claims: [], votes: [] }
    expect(parseOwnDocs('not json')).toEqual(empty)
    expect(parseOwnDocs(null)).toEqual(empty)
    expect(parseOwnDocs('{"claims":"a","votes":[]}')).toEqual(empty)
    expect(parseOwnDocs('{"claims":[1],"votes":[]}')).toEqual(empty)
  })
})
