import { supabase } from './supabase'

const SESSION_KEY = 'app_session'
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000

export async function validateAccessCode(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('access_codes')
      .select('id')
      .eq('code', code.trim())
      .eq('active', true)
      .maybeSingle()

    if (error) throw error
    return !!data
  } catch (err) {
    console.error('Error validating access code:', err)
    return false
  }
}

export function createSession(): void {
  const session = {
    token: Math.random().toString(36).substring(7),
    timestamp: Date.now()
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): { token: string; timestamp: number } | null {
  try {
    const session = localStorage.getItem(SESSION_KEY)
    if (!session) return null

    const parsed = JSON.parse(session)
    const age = Date.now() - parsed.timestamp

    if (age > SESSION_TIMEOUT) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return parsed
  } catch (err) {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return !!getSession()
}
