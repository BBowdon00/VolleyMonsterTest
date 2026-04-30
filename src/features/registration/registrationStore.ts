import { createContext, useContext, useReducer, useEffect } from 'react'
import type { Dispatch, ReactNode } from 'react'

// ─── State shape ──────────────────────────────────────────────────────────────

export type RegistrationStep = 'days' | 'captain' | 'roster' | 'review'

export interface PlayerEntry {
  name: string
}

export interface DayEntry {
  tournamentDayId: string
  dayLabel: string | null
  divisionId: string
  divisionDisplayName: string
  feeCents: number
  teamSize: number
  teamName: string
  players: PlayerEntry[]
}

export interface CaptainInfo {
  name: string
  email: string
  phone: string
  city: string
}

export interface RegistrationState {
  step: RegistrationStep
  captain: CaptainInfo
  dayEntries: DayEntry[]
}

const DEFAULT_STATE: RegistrationState = {
  step: 'days',
  captain: { name: '', email: '', phone: '', city: '' },
  dayEntries: [],
}

const SESSION_KEY = 'vm_registration'

function loadFromSession(): RegistrationState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return DEFAULT_STATE
    return JSON.parse(raw) as RegistrationState
  } catch {
    return DEFAULT_STATE
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type RegistrationAction =
  | { type: 'SET_STEP'; step: RegistrationStep }
  | { type: 'SET_CAPTAIN'; captain: CaptainInfo }
  | { type: 'SET_DAY_ENTRIES'; dayEntries: DayEntry[] }
  | { type: 'UPDATE_DAY_ENTRY'; tournamentDayId: string; patch: Partial<DayEntry> }
  | { type: 'RESET' }

function reducer(state: RegistrationState, action: RegistrationAction): RegistrationState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }
    case 'SET_CAPTAIN':
      return { ...state, captain: action.captain }
    case 'SET_DAY_ENTRIES':
      return { ...state, dayEntries: action.dayEntries }
    case 'UPDATE_DAY_ENTRY':
      return {
        ...state,
        dayEntries: state.dayEntries.map((entry) =>
          entry.tournamentDayId === action.tournamentDayId ? { ...entry, ...action.patch } : entry,
        ),
      }
    case 'RESET':
      return { ...DEFAULT_STATE }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface RegistrationContextValue {
  state: RegistrationState
  dispatch: Dispatch<RegistrationAction>
}

import { createElement } from 'react'

// We use `null` as the uninitialised sentinel; the provider always supplies a value
const RegistrationContext = createContext<RegistrationContextValue | null>(null)

interface RegistrationProviderProps {
  children: ReactNode
}

export function RegistrationProvider({ children }: RegistrationProviderProps) {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromSession)

  // Persist to sessionStorage on every state change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
    } catch {
      // Storage might be unavailable (private browsing quota etc.)
    }
  }, [state])

  return createElement(RegistrationContext.Provider, { value: { state, dispatch } }, children)
}

export function useRegistration(): RegistrationContextValue {
  const ctx = useContext(RegistrationContext)
  if (!ctx) {
    throw new Error('useRegistration must be used inside <RegistrationProvider>')
  }
  return ctx
}

/** Call this after a successful submission to wipe session storage. */
export function clearRegistrationSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}
