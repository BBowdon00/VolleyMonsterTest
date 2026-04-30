import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useRegistration } from './registrationStore'
import type { DayEntry, PlayerEntry } from './registrationStore'

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts.length > 1 ? (parts[parts.length - 1] ?? '') : (parts[0] ?? '')
}

function buildDefaultTeamName(leadName: string, otherPlayers: PlayerEntry[]): string {
  const leadLast = getLastName(leadName)
  const partnerName = otherPlayers.find((p) => p.name.trim())?.name ?? ''
  const partnerLast = getLastName(partnerName)
  if (leadLast && partnerLast) return `${leadLast} / ${partnerLast}`
  if (leadLast) return leadLast
  return ''
}

interface RosterDaySectionProps {
  entry: DayEntry
  dayIndex: number
  contactName: string
  onChange: (patch: Partial<DayEntry>) => void
}

function RosterDaySection({ entry, dayIndex, contactName, onChange }: RosterDaySectionProps) {
  // Default to "I'm playing" when player 0 is empty or is already the contact's name
  const p0Name = entry.players[0]?.name ?? ''
  const [contactPlays, setContactPlays] = useState(p0Name === '' || p0Name === contactName)

  const clampedPlayers: PlayerEntry[] = Array.from({ length: entry.teamSize }, (_, i) => ({
    name: entry.players[i]?.name ?? '',
  }))

  function updatePlayer(index: number, patch: Partial<PlayerEntry>) {
    const updated = clampedPlayers.map((p, i) => (i === index ? { ...p, ...patch } : p))
    const leadName = contactPlays ? contactName : (updated[0]?.name ?? '')
    const autoName = buildDefaultTeamName(leadName, contactPlays ? updated : updated.slice(1))
    onChange({
      players: updated,
      teamName: entry.teamName || autoName,
    })
  }

  function handleContactPlaysToggle() {
    const next = !contactPlays
    setContactPlays(next)
    const updated = clampedPlayers.map((p, i) =>
      i === 0 ? { ...p, name: next ? contactName : '' } : p,
    )
    const autoName = buildDefaultTeamName(
      next ? contactName : '',
      next ? updated.slice(1) : updated.slice(1),
    )
    onChange({
      players: updated,
      teamName: entry.teamName || autoName,
    })
  }

  function handlePlayerNameBlur() {
    if (!entry.teamName) {
      const leadName = contactPlays ? contactName : (clampedPlayers[0]?.name ?? '')
      const others = contactPlays ? clampedPlayers : clampedPlayers.slice(1)
      const name = buildDefaultTeamName(leadName, others)
      if (name) onChange({ teamName: name })
    }
  }

  // Effective display players — slot 0 shows contactName when contactPlays
  const displayPlayers = clampedPlayers.map((p, i) =>
    i === 0 && contactPlays ? { name: contactName } : p,
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">
        Day {dayIndex + 1}
        {entry.dayLabel ? `: ${entry.dayLabel}` : ''}
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({entry.divisionDisplayName})
        </span>
      </h3>

      {/* Team name */}
      <div>
        <Label htmlFor={`team-name-${entry.tournamentDayId}`}>Team Name</Label>
        <Input
          id={`team-name-${entry.tournamentDayId}`}
          type="text"
          value={entry.teamName}
          onChange={(e) => onChange({ teamName: e.target.value })}
          placeholder="Smith / Jones"
          className="mt-1"
        />
      </div>

      {/* "I'm playing" toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={contactPlays}
          onChange={handleContactPlaysToggle}
          className="h-4 w-4 rounded border-gray-300 text-teal-500 focus:ring-teal-400"
        />
        <span className="text-sm text-gray-700">
          I&apos;m playing on this day{contactName ? ` (${contactName})` : ''}
        </span>
      </label>

      {/* Player rows */}
      <div className="space-y-3">
        {displayPlayers.map((player, pIdx) => (
          <div key={pIdx} className="flex-1">
            <Label htmlFor={`player-${entry.tournamentDayId}-${pIdx}`}>
              Player {pIdx + 1}
              {pIdx === 0 && contactPlays ? ' (You)' : ''}
            </Label>
            <Input
              id={`player-${entry.tournamentDayId}-${pIdx}`}
              type="text"
              value={player.name}
              disabled={pIdx === 0 && contactPlays}
              onChange={(e) => updatePlayer(pIdx, { name: e.target.value })}
              onBlur={handlePlayerNameBlur}
              placeholder={`Player ${pIdx + 1} name`}
              className="mt-1"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StepRoster() {
  const { state, dispatch } = useRegistration()
  const { dayEntries, captain } = state

  function handleChange(tournamentDayId: string, patch: Partial<DayEntry>) {
    dispatch({ type: 'UPDATE_DAY_ENTRY', tournamentDayId, patch })
  }

  function canProceed(): boolean {
    return dayEntries.every((entry) => {
      if (!entry.teamName.trim()) return false
      if (entry.players.length !== entry.teamSize) return false
      return entry.players.every((p) => p.name.trim().length > 0)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Roster</h2>
        <p className="mt-1 text-sm text-gray-500">Enter your team name and players for each day.</p>
      </div>

      <div className="space-y-4">
        {dayEntries.map((entry, index) => (
          <RosterDaySection
            key={entry.tournamentDayId}
            entry={entry}
            dayIndex={index}
            contactName={captain.name}
            onChange={(patch) => handleChange(entry.tournamentDayId, patch)}
          />
        ))}
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => dispatch({ type: 'SET_STEP', step: 'captain' })}
        >
          ← Back
        </Button>
        <Button
          type="button"
          onClick={() => dispatch({ type: 'SET_STEP', step: 'review' })}
          disabled={!canProceed()}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}
