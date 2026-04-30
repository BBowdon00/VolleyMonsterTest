import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Player {
  id: string
  name: string
  jersey_number: string | null
  shirt_size: string | null
  sort_order: number
}

interface EditableRosterProps {
  token: string
  players: Player[]
}

interface PlayerRowState {
  name: string
  jerseyNumber: string
  shirtSize: string
  saving: boolean
  error: string | null
  saved: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EditableRoster({ token, players }: EditableRosterProps) {
  const [rows, setRows] = useState<PlayerRowState[]>(
    players.map((p) => ({
      name: p.name,
      jerseyNumber: p.jersey_number ?? '',
      shirtSize: p.shirt_size ?? '',
      saving: false,
      error: null,
      saved: false,
    })),
  )

  function updateRow(index: number, patch: Partial<PlayerRowState>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  async function handleSave(index: number) {
    const row = rows[index]
    const player = players[index]
    if (!row || !player) return

    if (!row.name.trim()) {
      updateRow(index, { error: 'Player name is required.' })
      return
    }

    updateRow(index, { saving: true, error: null, saved: false })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('manage_team_update_player', {
      token,
      player_id: player.id,
      new_name: row.name.trim(),
      new_jersey_number: row.jerseyNumber.trim() || null,
      new_shirt_size: row.shirtSize || null,
    })

    if (error) {
      updateRow(index, { saving: false, error: error.message })
      return
    }

    if (data === false) {
      updateRow(index, {
        saving: false,
        error: 'Could not update player. Edits may be locked or the link is invalid.',
      })
      return
    }

    updateRow(index, { saving: false, saved: true, error: null })
    toast.success(`${row.name.trim()} saved!`)
  }

  return (
    <div className="space-y-4">
      {players.map((player, index) => {
        const row = rows[index]
        if (!row) return null

        return (
          <div key={player.id} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Player {index + 1}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Name */}
              <div className="sm:col-span-1">
                <label
                  htmlFor={`player-name-${player.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name
                </label>
                <Input
                  id={`player-name-${player.id}`}
                  type="text"
                  value={row.name}
                  onChange={(e) =>
                    updateRow(index, { name: e.target.value, saved: false, error: null })
                  }
                  placeholder="Full name"
                />
              </div>

              {/* Jersey number */}
              <div>
                <label
                  htmlFor={`player-jersey-${player.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Jersey #
                </label>
                <Input
                  id={`player-jersey-${player.id}`}
                  type="text"
                  value={row.jerseyNumber}
                  onChange={(e) =>
                    updateRow(index, {
                      jerseyNumber: e.target.value,
                      saved: false,
                      error: null,
                    })
                  }
                  placeholder="Optional"
                />
              </div>

              {/* Shirt size */}
              <div>
                <label
                  htmlFor={`player-shirt-${player.id}`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Shirt size
                </label>
                <select
                  id={`player-shirt-${player.id}`}
                  value={row.shirtSize}
                  onChange={(e) =>
                    updateRow(index, { shirtSize: e.target.value, saved: false, error: null })
                  }
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">— Select —</option>
                  {SHIRT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error */}
            {row.error && <p className="text-sm text-red-600">{row.error}</p>}

            {/* Save button + saved indicator */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => handleSave(index)}
                disabled={row.saving}
              >
                {row.saving ? 'Saving…' : 'Save'}
              </Button>
              {row.saved && !row.saving && (
                <span className="text-sm text-green-600 font-medium">Saved</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
