import { describe, it, expect } from 'vitest'
import { captainSchema, orderSubmitSchema } from '../schemas/registration'

// ─── captainSchema ────────────────────────────────────────────────────────────

const validCaptain = {
  name: 'Alice Smith',
  email: 'Alice@Example.COM',
  phone: '3015551234',
  city: 'Washington',
}

describe('captainSchema', () => {
  it('accepts a valid captain', () => {
    expect(() => captainSchema.parse(validCaptain)).not.toThrow()
  })

  it('normalises email to lowercase', () => {
    const result = captainSchema.parse(validCaptain)
    expect(result.email).toBe('alice@example.com')
  })

  it('rejects an empty name', () => {
    expect(() => captainSchema.parse({ ...validCaptain, name: '' })).toThrow()
  })

  it('rejects a whitespace-only name', () => {
    expect(() => captainSchema.parse({ ...validCaptain, name: '   ' })).toThrow()
  })

  it('rejects an invalid email', () => {
    expect(() => captainSchema.parse({ ...validCaptain, email: 'not-an-email' })).toThrow()
  })

  it('rejects an empty city', () => {
    expect(() => captainSchema.parse({ ...validCaptain, city: '' })).toThrow()
  })

  describe('phone normalisation', () => {
    it('prepends +1 for a bare 10-digit US number', () => {
      const result = captainSchema.parse({ ...validCaptain, phone: '3015551234' })
      expect(result.phone).toBe('+13015551234')
    })

    it('strips formatting and prepends +1 for (301) 555-1234', () => {
      const result = captainSchema.parse({ ...validCaptain, phone: '(301) 555-1234' })
      expect(result.phone).toBe('+13015551234')
    })

    it('strips formatting and prepends +1 for 301-555-1234', () => {
      const result = captainSchema.parse({ ...validCaptain, phone: '301-555-1234' })
      expect(result.phone).toBe('+13015551234')
    })

    it('accepts an already-normalised E.164 number unchanged', () => {
      const result = captainSchema.parse({ ...validCaptain, phone: '+13015551234' })
      expect(result.phone).toBe('+13015551234')
    })

    it('accepts an international number', () => {
      const result = captainSchema.parse({ ...validCaptain, phone: '+44 7911 123456' })
      expect(result.phone).toBe('+447911123456')
    })

    it('rejects a number with too few digits', () => {
      expect(() => captainSchema.parse({ ...validCaptain, phone: '12345' })).toThrow()
    })

    it('rejects a number that starts with 0 after normalisation', () => {
      // 9-digit number starting with 0 → +0... which fails [1-9] check
      expect(() => captainSchema.parse({ ...validCaptain, phone: '012345678' })).toThrow()
    })
  })
})

// ─── orderSubmitSchema ────────────────────────────────────────────────────────

// Valid RFC 4122 v4 UUIDs: third group starts with 4, fourth with 8-b
const DAY_1 = 'a0000000-0000-4000-8000-000000000001'
const DAY_2 = 'a0000000-0000-4000-8000-000000000002'
const DIV = 'b0000000-0000-4000-8000-000000000001'

const baseEntry = {
  tournamentDayId: DAY_1,
  divisionId: DIV,
  teamName: 'Alice / Bob',
  players: [{ name: 'Alice' }, { name: 'Bob' }],
}

const validOrder = {
  captain: { name: 'Alice', email: 'alice@example.com', phone: '3015551234', city: 'DC' },
  dayEntries: [baseEntry],
  agreedToRules: true as const,
}

describe('orderSubmitSchema', () => {
  it('accepts a valid single-day order', () => {
    expect(() => orderSubmitSchema.parse(validOrder)).not.toThrow()
  })

  it('accepts a valid two-day order with different day IDs', () => {
    const order = {
      ...validOrder,
      dayEntries: [baseEntry, { ...baseEntry, tournamentDayId: DAY_2 }],
    }
    expect(() => orderSubmitSchema.parse(order)).not.toThrow()
  })

  it('rejects when the same tournament day appears twice', () => {
    const order = {
      ...validOrder,
      dayEntries: [baseEntry, { ...baseEntry, tournamentDayId: DAY_1 }],
    }
    expect(() => orderSubmitSchema.parse(order)).toThrow()
  })

  it('rejects when agreedToRules is false', () => {
    expect(() => orderSubmitSchema.parse({ ...validOrder, agreedToRules: false })).toThrow()
  })

  it('rejects when no day entries are provided', () => {
    expect(() => orderSubmitSchema.parse({ ...validOrder, dayEntries: [] })).toThrow()
  })

  it('rejects a roster with fewer than 2 players', () => {
    const order = {
      ...validOrder,
      dayEntries: [{ ...baseEntry, players: [{ name: 'Alice' }] }],
    }
    expect(() => orderSubmitSchema.parse(order)).toThrow()
  })

  it('rejects a roster with more than 6 players', () => {
    const players = Array.from({ length: 7 }, (_, i) => ({ name: `Player ${i + 1}` }))
    const order = { ...validOrder, dayEntries: [{ ...baseEntry, players }] }
    expect(() => orderSubmitSchema.parse(order)).toThrow()
  })

  it('rejects a tournamentDayId that is not a valid UUID', () => {
    const order = {
      ...validOrder,
      dayEntries: [{ ...baseEntry, tournamentDayId: 'not-a-uuid' }],
    }
    expect(() => orderSubmitSchema.parse(order)).toThrow()
  })
})
