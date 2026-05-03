interface PlayerLike {
  name: string
}

export function autoTeamName(players: PlayerLike[]): string {
  return players
    .map((p) => p.name.trim())
    .filter(Boolean)
    .join(' / ')
}
