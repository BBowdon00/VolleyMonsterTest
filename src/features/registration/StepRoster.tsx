import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { autoTeamName } from '@/lib/teamName'
import { useRegistration } from './registrationStore'
import type { DayEntry, PlayerEntry, TeamNameStyle } from './registrationStore'

interface RosterDaySectionProps {
  entry: DayEntry
  dayIndex: number
  contactName: string
  onChange: (patch: Partial<DayEntry>) => void
}

function RosterDaySection({ entry, dayIndex, contactName, onChange }: RosterDaySectionProps) {
  const p0Name = entry.players[0]?.name ?? ''
  const [contactPlays, setContactPlays] = useState(p0Name === '' || p0Name === contactName)
  const nameStyle = entry.nameStyle ?? 'last'

  const slots: PlayerEntry[] = Array.from({ length: entry.teamSize }, (_, i) => ({
    name: entry.players[i]?.name ?? '',
  }))

  // Sync store on mount: if contactPlays is on but player 0 in the store is still empty,
  // write the contact name now so canProceed() sees a real value.
  useEffect(() => {
    if (contactPlays && contactName && (entry.players[0]?.name ?? '') !== contactName) {
      const synced = slots.map((p, i) => (i === 0 ? { name: contactName } : p))
      onChange({ players: synced, teamName: autoTeamName(synced, nameStyle) })
    }
    // Intentionally only on mount — corrects an initialization gap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updatePlayer(index: number, name: string) {
    const updated = slots.map((p, i) => (i === index ? { name } : p))
    const effective = updated.map((p, i) => (i === 0 && contactPlays ? { name: contactName } : p))
    onChange({ players: effective, teamName: autoTeamName(effective, nameStyle) })
  }

  function handleContactPlaysToggle() {
    const next = !contactPlays
    setContactPlays(next)
    const updated = slots.map((p, i) => (i === 0 ? { name: next ? contactName : '' } : p))
    onChange({ players: updated, teamName: autoTeamName(updated, nameStyle) })
  }

  function handleNameStyleChange(style: TeamNameStyle) {
    const effective = slots.map((p, i) => (i === 0 && contactPlays ? { name: contactName } : p))
    onChange({ nameStyle: style, teamName: autoTeamName(effective, style) })
  }

  const displayPlayers = slots.map((p, i) => (i === 0 && contactPlays ? { name: contactName } : p))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">
        Day {dayIndex + 1}
        {entry.dayLabel ? `: ${entry.dayLabel}` : ''}
        <span className="ml-2 text-sm font-normal text-gray-500">
          ({entry.divisionDisplayName})
        </span>
      </h3>

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

      {/* Player slots */}
      <div className="space-y-3">
        {displayPlayers.map((player, pIdx) => (
          <div key={pIdx}>
            <Label htmlFor={`player-${entry.tournamentDayId}-${pIdx}`}>
              Player {pIdx + 1}
              {pIdx === 0 && contactPlays ? ' (You)' : ''}
            </Label>
            <Input
              id={`player-${entry.tournamentDayId}-${pIdx}`}
              type="text"
              value={player.name}
              disabled={pIdx === 0 && contactPlays}
              onChange={(e) => updatePlayer(pIdx, e.target.value)}
              placeholder={`Player ${pIdx + 1} name`}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      {/* Team name display style */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Team name
          </span>
          <span className="truncate text-sm font-medium text-gray-900">
            {autoTeamName(displayPlayers, nameStyle) || (
              <span className="italic text-gray-400">(auto from players)</span>
            )}
          </span>
        </div>
        <fieldset>
          <legend className="sr-only">Team name style</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`name-style-${entry.tournamentDayId}`}
                checked={nameStyle === 'last'}
                onChange={() => handleNameStyleChange('last')}
                className="h-3.5 w-3.5 border-gray-300 text-teal-500 focus:ring-teal-400"
              />
              <span className="text-gray-700">Last names only</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`name-style-${entry.tournamentDayId}`}
                checked={nameStyle === 'full'}
                onChange={() => handleNameStyleChange('full')}
                className="h-3.5 w-3.5 border-gray-300 text-teal-500 focus:ring-teal-400"
              />
              <span className="text-gray-700">Full names</span>
            </label>
          </div>
        </fieldset>
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
    return dayEntries.every(
      (entry) =>
        entry.players.length === entry.teamSize &&
        entry.players.every((p) => p.name.trim().length > 0),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Roster</h2>
        <p className="mt-1 text-sm text-gray-500">Enter the players for each day.</p>
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
