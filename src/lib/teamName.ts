import type { TeamNameStyle } from '@/features/registration/registrationStore'

interface PlayerLike {
  name: string
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : (parts[0] ?? '')
}

export function autoTeamName(players: PlayerLike[], style: TeamNameStyle = 'last'): string {
  const names = players
    .map((p) => (style === 'full' ? p.name.trim() : getLastName(p.name)))
    .filter(Boolean)
  return names.join(' / ')
}
