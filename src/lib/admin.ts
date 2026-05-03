const TOKEN_KEY = 'vm-admin-token'

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

export class AdminUnauthorizedError extends Error {
  constructor() {
    super('admin_unauthorized')
    this.name = 'AdminUnauthorizedError'
  }
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken()
  if (!token) throw new AdminUnauthorizedError()

  const headers = new Headers(init.headers)
  headers.set('x-admin-token', token)

  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) {
    clearAdminToken()
    throw new AdminUnauthorizedError()
  }
  return res
}
