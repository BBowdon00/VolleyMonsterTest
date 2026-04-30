import { z } from 'zod'

// E.164 phone — allows common formats like (301) 555-1234, +13015551234, 301-555-1234
const phoneRegex = /^\+?[1-9]\d{6,14}$/

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  // Prepend +1 for 10-digit US numbers
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

export const captainSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address'),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((v) => phoneRegex.test(v), 'Enter a valid phone number'),
  city: z.string().trim().min(1, 'City is required'),
})

export type Captain = z.infer<typeof captainSchema>

export const shirtSizeEnum = z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'])

export const playerSchema = z.object({
  name: z.string().trim().min(1, 'Player name is required'),
  shirtSize: shirtSizeEnum.optional(),
})

export type Player = z.infer<typeof playerSchema>

export const dayEntrySchema = z.object({
  tournamentDayId: z.string().uuid('Invalid tournament day'),
  divisionId: z.string().uuid('Invalid division'),
  teamName: z.string().trim().min(1, 'Team name is required'),
  // roster length enforced at runtime against division min/max
  players: z.array(playerSchema).min(2).max(6),
})

export type DayEntry = z.infer<typeof dayEntrySchema>

export const orderSubmitSchema = z
  .object({
    captain: captainSchema,
    // 1–2 days for current season; schema is intentionally permissive on count
    dayEntries: z
      .array(dayEntrySchema)
      .min(1, 'Select at least one day')
      .max(10),
    agreedToRules: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the tournament rules' }),
    }),
  })
  .refine(
    (data) => {
      // No two entries can reference the same tournament day
      const dayIds = data.dayEntries.map((e) => e.tournamentDayId)
      return new Set(dayIds).size === dayIds.length
    },
    { message: 'Duplicate day selected', path: ['dayEntries'] },
  )

export type OrderSubmit = z.infer<typeof orderSubmitSchema>
