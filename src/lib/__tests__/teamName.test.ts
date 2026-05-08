import { describe, it, expect } from 'vitest'
import { autoTeamName } from '../teamName'

describe('autoTeamName', () => {
  it('joins two player names with " / "', () => {
    expect(autoTeamName([{ name: 'Alice' }, { name: 'Bob' }])).toBe('Alice / Bob')
  })

  it('joins three player names', () => {
    expect(autoTeamName([{ name: 'A' }, { name: 'B' }, { name: 'C' }])).toBe('A / B / C')
  })

  it('returns the name alone for a single player', () => {
    expect(autoTeamName([{ name: 'Alice' }])).toBe('Alice')
  })

  it('returns an empty string for an empty array', () => {
    expect(autoTeamName([])).toBe('')
  })

  it('trims leading and trailing whitespace from each name', () => {
    expect(autoTeamName([{ name: '  Alice  ' }, { name: '\tBob\t' }])).toBe('Alice / Bob')
  })

  it('filters out empty-string names', () => {
    expect(autoTeamName([{ name: 'Alice' }, { name: '' }, { name: 'Bob' }])).toBe('Alice / Bob')
  })

  it('filters out whitespace-only names', () => {
    expect(autoTeamName([{ name: 'Alice' }, { name: '   ' }, { name: 'Bob' }])).toBe('Alice / Bob')
  })
})
