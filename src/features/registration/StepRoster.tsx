import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { autoTeamName } from '@/lib/teamName'
import { useRegistration } from './registrationStore'
import type { DayEntry, PlayerEntry } from './registrationStore'

type CodeValidity = 'idle' | 'checking' | 'valid' | 'invalid'

interface PlayerCodeState {
  validity: CodeValidity
  holderName: string | null
}

interface RosterDaySectionProps {
  entry: DayEntry
  dayIndex: number
  contactName: string
  onChange: (patch: Partial<DayEntry>) => void
}

function RosterDaySection({ entry, dayIndex, contactName, onChange }: RosterDaySectionProps) {
  const p0Name = entry.players[0]?.name ?? ''
  const [contactPlays, setContactPlays] = useState(p0Name === '' || p0Name === contactName)
  const [codeStates, setCodeStates] = useState<PlayerCodeState[]>(() =>
    Array.from({ length: entry.teamSize }, () => ({
      validity: 'idle' as CodeValidity,
      holderName: null,
    })),
  )

  const slots: PlayerEntry[] = Array.from({ length: entry.teamSize }, (_, i) => ({
    name: entry.players[i]?.name ?? '',
    passCode: entry.players[i]?.passCode ?? '',
  }))

  // Sync store on mount
  useEffect(() => {
    if (contactPlays && contactName && (entry.players[0]?.name ?? '') !== contactName) {
      const synced = slots.map((p, i) => (i === 0 ? { ...p, name: contactName } : p))
      onChange({ players: synced, teamName: autoTeamName(synced) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updatePlayer(index: number, name: string) {
    const updated = slots.map((p, i) => (i === index ? { ...p, name } : p))
    const effective = updated.map((p, i) =>
      i === 0 && contactPlays ? { ...p, name: contactName } : p,
    )
    onChange({ players: effective, teamName: autoTeamName(effective) })
  }

  function updatePassCode(index: number, code: string) {
    const updated = slots.map((p, i) => (i === index ? { ...p, passCode: code } : p))
    onChange({ players: updated })
    // Reset validity when code changes
    setCodeStates((prev) =>
      prev.map((s, i) => (i === index ? { validity: 'idle', holderName: null } : s)),
    )
  }

  async function validateCode(index: number) {
    const code = slots[index]?.passCode?.trim()
    if (!code) {
      setCodeStates((prev) =>
        prev.map((s, i) => (i === index ? { validity: 'idle', holderName: null } : s)),
      )
      return
    }
    setCodeStates((prev) =>
      prev.map((s, i) => (i === index ? { validity: 'checking', holderName: null } : s)),
    )
    try {
      const res = await fetch(`/api/validate-pass-code?code=${encodeURIComponent(code)}`)
      if (res.ok) {
        const data = (await res.json()) as { valid: boolean; holder_name?: string | null }
        setCodeStates((prev) =>
          prev.map((s, i) =>
            i === index
              ? { validity: data.valid ? 'valid' : 'invalid', holderName: data.holder_name ?? null }
              : s,
          ),
        )
      }
    } catch {
      setCodeStates((prev) =>
        prev.map((s, i) => (i === index ? { validity: 'idle', holderName: null } : s)),
      )
    }
  }

  function handleContactPlaysToggle() {
    const next = !contactPlays
    setContactPlays(next)
    const updated = slots.map((p, i) => (i === 0 ? { ...p, name: next ? contactName : '' } : p))
    onChange({ players: updated, teamName: autoTeamName(updated) })
  }

  const displayPlayers = slots.map((p, i) =>
    i === 0 && contactPlays ? { ...p, name: contactName } : p,
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

      <div className="space-y-4">
        {displayPlayers.map((player, pIdx) => {
          const cs = codeStates[pIdx] ?? { validity: 'idle' as CodeValidity, holderName: null }
          return (
            <div key={pIdx} className="space-y-1.5">
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
              />
              {/* Season pass code */}
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={player.passCode ?? ''}
                  onChange={(e) => updatePassCode(pIdx, e.target.value)}
                  onBlur={() => validateCode(pIdx)}
                  placeholder="Season pass code (optional)"
                  className="text-sm font-mono"
                  aria-label={`Season pass code for player ${pIdx + 1}`}
                />
                {cs.validity === 'checking' && (
                  <span className="shrink-0 text-xs text-gray-400">checking…</span>
                )}
                {cs.validity === 'valid' && (
                  <span className="shrink-0 text-xs font-semibold text-teal-600">
                    ✓{cs.holderName ? ` ${cs.holderName.split(' ')[0]}` : ' Valid'}
                  </span>
                )}
                {cs.validity === 'invalid' && (
                  <span className="shrink-0 text-xs font-semibold text-red-500">✗ Invalid</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Team name
        </span>
        <span className="truncate text-sm font-medium text-gray-900">
          {autoTeamName(displayPlayers) || (
            <span className="italic text-gray-400">(auto from players)</span>
          )}
        </span>
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
        <p className="mt-1 text-sm text-gray-500">
          Enter players for each day. If any player has a{' '}
          <a
            href="/season-pass"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 underline hover:text-teal-700"
          >
            season pass
          </a>
          , enter their code below their name.
        </p>
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
