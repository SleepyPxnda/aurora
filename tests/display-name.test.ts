import { describe, expect, it } from 'vitest'
import { validateDisplayName } from '../app/composables/useDisplayName'

describe('display name', () => {
  it('AC6: trims and enforces 1 to 40 characters', () => {
    expect(validateDisplayName('  Ada ')).toBe('Ada')
    expect(validateDisplayName('   ')).toBeNull()
    expect(validateDisplayName('')).toBeNull()
    expect(validateDisplayName('a'.repeat(40))).toBe('a'.repeat(40))
    expect(validateDisplayName('a'.repeat(41))).toBeNull()
  })
})
